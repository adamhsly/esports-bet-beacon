// news-agent.mjs
// RSS prefetch → shortlist → GPT-5 (no tools) → upsert posts to Supabase

import { createClient } from "@supabase/supabase-js";

// ---------- ENV ----------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// knobs
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 180000); // 3m is plenty (no tools)
const FEED_TIMEOUT_MS   = Number(process.env.FEED_TIMEOUT_MS   || 15000);
const MAX_FEED_ITEMS    = Number(process.env.MAX_FEED_ITEMS    || 12);    // shortlist cap before GPT
const MAX_POSTS         = Number(process.env.MAX_POSTS         || 3);     // how many stories to produce
const MAX_OUTPUT_TOKENS = Number(process.env.MAX_OUTPUT_TOKENS || 1600);  // cap cost
const USER_AGENT        = process.env.USER_AGENT || "FragsFortunes-RSS/1.0 (+contact@example.com)";

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
      // if URL parsing fails, keep as-is with original link
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
async function callOpenAI(shortlist, { maxPosts = MAX_POSTS } = {}) {
  const shortlistText = shortlist
    .map(
      (i, idx) =>
        `${idx + 1}. ${i.title}\n   ${i.url}\n   ${i.published_time} (${i.source})`
    )
    .join("\n");

  const SYSTEM = `
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
        "markdown": "400–650 words, with H2 headings, concise paragraphs, and a Sources section that lists the same URLs you used."
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

  const USER = `Shortlist (today, UTC):\n${shortlistText}`;

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
        text: { format: { type: "text" } }, // no tools
        max_output_tokens: MAX_OUTPUT_TOKENS
      }),
    });
    const raw = await res.text();
    if (!res.ok) throw new Error(raw);

    const env = JSON.parse(raw);
    const content =
      env.output_text ??
      env.output?.[0]?.content?.[0]?.text ??
      env.message?.content?.[0]?.text;
    if (!content) throw new Error("No content from model");

    const trimmed = content.trim();
    if (!trimmed.startsWith("{")) throw new Error("Model did not return JSON");
    return JSON.parse(trimmed);
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

  console.log("🧠 Asking GPT-5 (no tools) to write posts…");
  const result = await callOpenAI(shortlist, { maxPosts: MAX_POSTS });
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
