// news-agent.mjs
// RSS prefetch → shortlist → GPT-5 (no tools) → upsert posts (with adaptive retry + robust parsing)

import { createClient } from "@supabase/supabase-js";

// ---------- ENV ----------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// knobs
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 180000); // 3m (no tools)
const FEED_TIMEOUT_MS   = Number(process.env.FEED_TIMEOUT_MS   || 15000);
const MAX_FEED_ITEMS    = Number(process.env.MAX_FEED_ITEMS    || 12);    // shortlist cap
const MAX_POSTS         = Number(process.env.MAX_POSTS         || 3);     // posts to produce (attempt 1)
const MAX_OUTPUT_TOKENS = Number(process.env.MAX_OUTPUT_TOKENS || 2600);  // cap cost (attempt 1)
const USER_AGENT        = process.env.USER_AGENT || "FragsFortunes-RSS/1.0 (+contact@example.com)";

// retry (attempt 2) knobs when we hit token cap
const RETRY_MAX_POSTS         = Number(process.env.RETRY_MAX_POSTS         || 1);
const RETRY_MAX_OUTPUT_TOKENS = Number(process.env.RETRY_MAX_OUTPUT_TOKENS || 2200); // slightly higher
const RETRY_WORDS_MIN         = Number(process.env.RETRY_WORDS_MIN         || 220);
const RETRY_WORDS_MAX         = Number(process.env.RETRY_WORDS_MAX         || 350);

// ---------- FEEDS ----------
const FEEDS = [
  "https://www.hltv.org/rss/news",
  "https://dotesports.com/category/league-of-legends/feed",
  "https://esportsinsider.com/feed",
  "https://esports-news.co.uk/feed",
  "https://www.dexerto.com/esports/feed",
  "https://blix.gg/feed",
];

// ---------- INIT ----------
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error("❌ Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or OPENAI_API_KEY.");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------- HELPERS ----------
function utcDateStr(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
const TODAY = utcDateStr();

function isTodayUTC(isoOrStr) {
  if (!isoOrStr) return false;
  const d = new Date(isoOrStr);
  if (isNaN(d.getTime())) return false;
  return utcDateStr(d) === TODAY;
}

async function fetchWithTimeout(url, opts = {}, ms = FEED_TIMEOUT_MS) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try { return await fetch(url, { ...opts, signal: controller.signal }); }
  finally { clearTimeout(t); }
}

function getAll(str, re) {
  const out = []; let m;
  while ((m = re.exec(str)) !== null) out.push(m);
  return out;
}
function decodeEntities(s) {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
function extractItems(xml) {
  const items = [];
  // RSS
  for (const m of getAll(xml, /<item>([\s\S]*?)<\/item>/gi)) {
    const block = m[1];
    const title = decodeEntities(
      (block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim()
    );
    const link =
      (block.match(/<link>(.*?)<\/link>/i)?.[1] ?? "").trim() ||
      (block.match(/<guid.*?>(.*?)<\/guid>/i)?.[1] ?? "").trim();
    const pub =
      (block.match(/<pubDate>(.*?)<\/pubDate>/i)?.[1] ?? "").trim();
    items.push({ title, link, pub });
  }
  if (items.length) return items;

  // Atom
  for (const m of getAll(xml, /<entry>([\s\S]*?)<\/entry>/gi)) {
    const block = m[1];
    const title = decodeEntities(
      (block.match(/<title.*?>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim()
    );
    const link =
      (block.match(/<link[^>]*?href="([^"]+)"/i)?.[1] ?? "").trim();
    const pub =
      (block.match(/<updated>(.*?)<\/updated>/i)?.[1] ??
        block.match(/<published>(.*?)<\/published>/i)?.[1] ??
        "").trim();
    items.push({ title, link, pub });
  }
  return items;
}
function toISO(s) {
  if (!s) return "";
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString();
  const parsed = Date.parse(s);
  return isNaN(parsed) ? "" : new Date(parsed).toISOString();
}
function isEsportsTitle(title) {
  const t = (title || "").toLowerCase();
  const include = /(cs2|counter[- ]?strike|league of legends|lol\b|worlds|dota|valorant|vct|esl|blast|iem|lpl|lec|lcs|karmine|fnatic|g2|vitality|hltv|lolesports|vici|koi|gentle mates)/i.test(t);
  const exclude = /(promo code|referral code|casino|slots|betting code|coupon)/i.test(t);
  return include && !exclude;
}

// ---------- FETCH & SHORTLIST ----------
async function fetchFeed(url) {
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/rss+xml, application/xml, text/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) {
      console.warn("⚠️ Feed HTTP", res.status, url);
      return [];
    }
    const xml = await res.text();
    const items = extractItems(xml).map((i) => ({
      title: i.title,
      url: i.link,
      published_time: toISO(i.pub),
      source: new URL(url).hostname.replace(/^www\./, ""),
    }));
    return items;
  } catch (e) {
    console.warn("⚠️ Feed error:", url, String(e));
    return [];
  }
}

async function buildShortlist() {
  const all = (await Promise.all(FEEDS.map(fetchFeed))).flat();
  const today = all.filter(
    (i) => i.url && isTodayUTC(i.published_time) && isEsportsTitle(i.title)
  );
  const seen = new Set();
  const deduped = [];
  for (const item of today) {
    try {
      const u = new URL(item.url);
      u.search = "";
      const key = u.toString();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    } catch {
      const key = item.url;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }
  }
  deduped.sort((a, b) => (a.published_time < b.published_time ? 1 : -1));
  return deduped.slice(0, MAX_FEED_ITEMS);
}

// ---------- OPENAI (NO TOOLS) ----------
function buildSystemPrompt({ maxPosts, wordsMin, wordsMax }) {
  return `
You are the Frags & Fortunes esports News agent.

You will receive a shortlist of today's esports headlines (title, URL, ISO UTC time, source).
Select up to ${maxPosts} of the most relevant, diverse, and important items (esports only).
Write the JSON object below (no tooling, no browsing). Use UK English.

JSON OUTPUT (ONLY this):
{
  "date": "${TODAY}",
  "posts": [
    {
      "kind": "news",
      "league": "string or null",
      "teams": ["string", ...] or [],
      "tags": ["string", ...] or [],
      "title": "headline (>=8 chars)",
      "summary": "1–2 sentences (>=30 chars)",
      "tweet": "<=260 chars, max 2 hashtags",
      "article": {
        "markdown": "${wordsMin}–${wordsMax} words, with H2 headings, concise paragraphs, and a Sources section that lists the same URLs you used."
      },
      "sources": [
        { "title": "string", "url": "https://..." },
        { "title": "string", "url": "https://..." }
      ],
      "images": [],
      "published_time": "<ISO 8601 UTC>"
    }
  ]
}
Return ONLY the JSON object; no extra commentary.
`.trim();
}

function shortlistToUser(shortlist) {
  return `Shortlist (today, UTC):\n` + shortlist
    .map((i, idx) => `${idx + 1}. ${i.title}\n   ${i.url}\n   ${i.published_time} (${i.source})`)
    .join("\n");
}

// NEW robust extractor: collect every text fragment from envelope
function extractTextFromEnvelope(env) {
  if (typeof env?.output_text === "string" && env.output_text.trim()) {
    return env.output_text.trim();
  }
  const chunks = [];

  if (Array.isArray(env?.output)) {
    for (const out of env.output) {
      const c = out?.content;
      if (Array.isArray(c)) {
        for (const block of c) {
          if (typeof block?.text === "string" && block.text.trim()) {
            chunks.push(block.text.trim());
          }
        }
      }
    }
  }

  const mc = env?.message?.content;
  if (Array.isArray(mc)) {
    for (const block of mc) {
      if (typeof block?.text === "string" && block.text.trim()) {
        chunks.push(block.text.trim());
      }
    }
  }

  return chunks.length ? chunks.join("\n") : null;
}

function extractJSON(text) {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try { return JSON.parse(trimmed); } catch { /* fallthrough */ }
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const slice = text.slice(start, end + 1);
    try { return JSON.parse(slice); } catch { /* fallthrough */ }
  }
  return null;
}

async function callOpenAI_JSON({ shortlist, maxPosts, wordsMin, wordsMax, maxOutputTokens }) {
  const SYSTEM = buildSystemPrompt({ maxPosts, wordsMin, wordsMax });
  const USER = shortlistToUser(shortlist);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-5",
        input: [
          { role: "system", content: SYSTEM },
          { role: "user", content: USER },
        ],
        text: { format: { type: "json_object" } },
        max_output_tokens: maxOutputTokens,
        temperature: 0.3,
        top_p: 1
      }),
    });

    const raw = await res.text();
    if (!res.ok) {
      console.error("❌ OpenAI HTTP error:", res.status, res.statusText);
      console.error("Raw:", raw.slice(0, 1200));
      throw new Error(`OpenAI HTTP ${res.status}`);
    }

    const env = JSON.parse(raw);

    // Debug essentials
    console.log("ℹ️ OpenAI envelope:", JSON.stringify({
      status: env.status,
      incomplete_details: env.incomplete_details,
      usage: env.usage,
      max_output_tokens: env.max_output_tokens
    }));

    if (env.output_parsed) return { data: env.output_parsed, env };

    const text = extractTextFromEnvelope(env);
    if (!text) {
      console.error("Envelope preview:", JSON.stringify(env).slice(0, 1200));
      throw new Error("No content from model");
    }

    const obj = extractJSON(text);
    if (!obj) {
      console.error("⚠️ Could not parse JSON. First 600 chars of text:\n", text.slice(0, 600));
      throw new Error("Model did not return parseable JSON");
    }
    return { data: obj, env };

  } finally {
    clearTimeout(t);
  }
}

// ---------- SUPABASE ----------
function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
async function md5(str) {
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("MD5", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function ensureShape(p) {
  const need = ["kind", "title", "summary", "tweet", "article", "sources", "images"];
  const missing = need.filter((k) => !(k in p));
  if (missing.length) throw new Error("Missing keys: " + missing.join(", "));
  if (!p.article?.markdown || p.article.markdown.length < 200)
    throw new Error("article.markdown too short");
  if (!Array.isArray(p.sources) || p.sources.length < 1)
    throw new Error("At least 1 source required");
  if (!Array.isArray(p.images)) throw new Error("images must be array");
}

// ---------- MAIN ----------
(async () => {
  console.log("📰 Building shortlist from RSS…");
  const shortlist = await buildShortlist();
  console.log(`✅ Shortlist size: ${shortlist.length}`);
  if (shortlist.length === 0) {
    console.log("No today-items found. Exiting gracefully.");
    process.exit(0);
  }

  console.log("🧠 Asking GPT-5 (no tools) to write posts… (attempt 1)");
  let attempt = await callOpenAI_JSON({
    shortlist,
    maxPosts: MAX_POSTS,
    wordsMin: 400,
    wordsMax: 650,
    maxOutputTokens: MAX_OUTPUT_TOKENS
  }).catch(e => ({ error: e }));

  // If we hit max_output_tokens or got incomplete, retry with smaller ask
  if (!attempt?.data) {
    const env = attempt?.env;
    const hitCap = env?.status === "incomplete" && env?.incomplete_details?.reason === "max_output_tokens";
    if (hitCap) console.warn("⏳ Hit max_output_tokens; retrying with lighter request…");
    else console.warn("⚠️ First attempt failed; retrying smaller anyway…");

    attempt = await callOpenAI_JSON({
      shortlist,
      maxPosts: RETRY_MAX_POSTS,
      wordsMin: RETRY_WORDS_MIN,
      wordsMax: RETRY_WORDS_MAX,
      maxOutputTokens: RETRY_MAX_OUTPUT_TOKENS
    }).catch(e => ({ error: e }));
  }

  if (!attempt?.data) {
    console.error("❌ No content after retry.", attempt?.error || "");
    process.exit(1);
  }

  const result = attempt.data;

  if (!Array.isArray(result?.posts) || result.posts.length === 0) {
    console.warn("⚠️ No posts returned by model. Full payload:", JSON.stringify(result, null, 2));
    process.exit(0);
  }

  console.log(`💾 Upserting ${result.posts.length} post(s) to Supabase…`);
  for (const post of result.posts) {
    ensureShape(post);
    const srcKey = (post.sources || []).map((s) => s.url).sort().join("|");
    const unique_hash = await md5(`${post.title}|${srcKey}`);
    const slug = slugify(post.title);

    const { error } = await supabase.from("posts").upsert(
      {
        kind: post.kind || "news",
        title: post.title,
        slug,
        summary: post.summary,
        tweet_text: post.tweet,
        article_markdown: post.article.markdown,
        sources: post.sources,
        league: post.league ?? null,
        teams: post.teams ?? [],
        tags: post.tags ?? [],
        images: [],
        unique_hash,
        status: "ready",
        published_time: post.published_time ?? null,
      },
      { onConflict: "unique_hash" }
    );
    if (error) throw error;
    console.log("✅ Upserted:", post.title);
  }

  console.log("🎯 Done.");
})().catch((err) => {
  console.error("❌ news-agent failed:", err);
  process.exit(1);
});
