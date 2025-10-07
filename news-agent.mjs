// news-agent.mjs
// Runs via GitHub Action: fetches today’s esports news → inserts into Supabase.posts

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 600000);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error("❌ Missing required environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 🧠 Prompt (unrestricted, successful version)
const PROMPT = `
You are the Frags & Fortunes esports News agent.

OBJECTIVE:
Find and return 3–5 CURRENT, RELEVANT esports news stories published TODAY (UTC date).
Focus on top competitive titles such as CS2, League of Legends, Dota 2, and Valorant.

SEARCH INSTRUCTIONS:
- Use your web_search tool freely to check multiple major esports news sites:
  HLTV.org, DotEsports.com, Esports.gg, Blix.gg, Liquipedia.net, LoLEsports.com, EsportsInsider.com, official team or event pages (e.g., vitality.gg, fnatic.com).
- You may browse as many sources as necessary to ensure you gather several stories.
- Filter only for items clearly dated TODAY (UTC) and directly related to esports — not general gaming, hardware, or influencer gossip.
- Choose the most credible, diverse, and interesting 3–5 items.

DO NOT worry about time or query limits.
Take as many searches and opens as needed to ensure complete, up-to-date results.

OUTPUT FORMAT (JSON ONLY):
{
  "date": "<YYYY-MM-DD UTC>",
  "posts": [
    {
      "kind": "news",
      "league": "string or null",
      "teams": ["string", ...] or [],
      "tags": ["string", ...] or [],
      "title": "string (headline, >=8 chars)",
      "summary": "1–2 sentences summarizing the story (>=30 chars)",
      "tweet": "string (<=260 chars, max 2 hashtags)",
      "article": {
        "markdown": "400–800 words, structured with H2 headings, concise paragraphs, and a Sources section with URLs."
      },
      "sources": [
        { "title": "string", "url": "https://..." },
        { "title": "string", "url": "https://..." }
      ],
      "images": [],  // leave empty, do NOT attempt to find or include images
      "published_time": "<ISO 8601 UTC, e.g., 2025-10-07T14:30:00Z>"
    }
  ]
}

WRITING STYLE:
- Clear, concise, journalistic.
- UK English.
- Each article should read like a professional esports report.
- Cite all URLs used inside “Sources” at the end of each markdown.

Return only the JSON object described above.
No extra commentary, markdown fences, or explanations.
`.trim();

async function callOpenAI(prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    console.log("🧠 Calling OpenAI (timeout:", OPENAI_TIMEOUT_MS, "ms)");
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-5",
        tools: [{ type: "web_search" }],
        input: [
          { role: "system", content: PROMPT },
          { role: "user", content: "Return esports news published today." },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI error: ${errText}`);
    }

    const json = await res.json();
    const content =
      json.output_text ??
      json.output?.[0]?.content?.[0]?.text ??
      null;

    if (!content) throw new Error("No content from model");
    return JSON.parse(content);
  } finally {
    clearTimeout(timeout);
  }
}

// Helpers
const slugify = s =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function md5(str) {
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("MD5", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// Main
(async () => {
  console.log("🤖 Starting Frags & Fortunes News Agent...");
  try {
    const result = await callOpenAI(PROMPT);
    if (!result?.posts || !Array.isArray(result.posts) || result.posts.length === 0) {
      console.warn("⚠️ No posts returned from model.");
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    console.log(`📰 Received ${result.posts.length} posts. Upserting to Supabase...`);
    for (const post of result.posts) {
      const srcKey = (post.sources || []).map(s => s.url).sort().join("|");
      const unique_hash = await md5(`${post.title}|${srcKey}`);
      const slug = slugify(post.title);

      const { error } = await supabase.from("posts").upsert({
        kind: post.kind || "news",
        title: post.title,
        slug,
        summary: post.summary,
        tweet_text: post.tweet,
        article_markdown: post.article?.markdown,
        sources: post.sources,
        league: post.league ?? null,
        teams: post.teams ?? [],
        tags: post.tags ?? [],
        images: post.images ?? [],
        unique_hash,
        status: "ready",
        published_time: post.published_time ?? null,
      }, { onConflict: "unique_hash" });

      if (error) throw error;
      console.log(`✅ Upserted: ${post.title}`);
    }

    console.log("🎯 Done. All posts stored successfully.");
  } catch (err) {
    console.error("❌ news-agent failed:", err);
    process.exit(1);
  }
})();
