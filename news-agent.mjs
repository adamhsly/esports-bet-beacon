// news-agent.mjs
// Robust: try with web_search; on ANY failure (timeout OR empty content), retry without search;
// if still empty, use a tiny fallback prompt to guarantee JSON.

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

// -------- ENV --------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 600000);
const IMAGE_TIMEOUT_MS  = Number(process.env.IMAGE_TIMEOUT_MS  || 600000);
const MAX_IMAGES        = Number(process.env.MAX_IMAGES        || 1);
const USE_SEARCH_ENV    = (process.env.USE_SEARCH ?? "1").trim();
const USE_SEARCH        = USE_SEARCH_ENV !== "0";

console.log('🔧 Env check:', {
  has_SUPABASE_URL: !!SUPABASE_URL,
  has_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
  has_OPENAI_API_KEY: !!OPENAI_API_KEY,
  OPENAI_TIMEOUT_MS,
  IMAGE_TIMEOUT_MS,
  MAX_IMAGES,
  USE_SEARCH
});

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error('❌ Missing required env vars. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// -------- HELPERS --------
function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function md5(str) {
  return createHash('md5').update(Buffer.from(str, 'utf8')).digest('hex');
}
async function fetchWithTimeout(input, init = {}, ms = 45000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(new DOMException('Timeout', 'AbortError')), ms);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally { clearTimeout(id); }
}

// -------- PROMPTS --------
const FAST_PROMPT = `
You are the Frags & Fortunes esports News agent.

GOAL:
- Produce ONE UK-relevant esports news item (prefer CS2 or LoL).
- Return ONLY a compact JSON object (no prose, no code fences).

IF YOU STARTED USING web_search AND HAVEN'T FINISHED:
- STOP tool use immediately and WRITE THE JSON with the credible information you already have.
- Do not include commentary; just the JSON.

WEB_SEARCH RULES (speed-optimized):
- Hard budget: MAX 2 queries, MAX 2 page opens total.
- Time budget: Finish tool use within ~15s; if exceeded, STOP and write.
- Prefer sources: hltv.org, dotesports.com, blix.gg, esports.gg, lolesports.com, esportsinsider.com, official team sites (vitality.gg, fnatic.com).
- Avoid: Reddit, random blogs, spam aggregators.
- Images: ONLY include if a direct https image is obvious (press/CDN). Otherwise use `"images": []`.

STOP CONDITIONS:
- Once you have 1 solid item with 2 sources (or 1 official + 1 major outlet) → STOP searching and write.
- If nothing credible after the 2×2 budget → STOP and write the best you have; `"images": []` is fine.

JSON keys only:
{
  "kind":"news",
  "league":"string",
  "teams":["string",...],
  "tags":["string",...],
  "title":"string",
  "summary":"string",
  "tweet":"string",
  "article":{"markdown":"string (>=200 chars)"},
  "sources":[{"title":"string","url":"https://..."}],
  "images":[{"url":"https://..."}]  // 0–1 allowed
}
Return only the JSON object.
`.trim();

const TINY_PROMPT = `Return only this JSON with realistic values (no prose):

{"kind":"news","league":"string","teams":["string"],"tags":["string"],"title":"string","summary":"string","tweet":"string","article":{"markdown":"at least 200 characters"},"sources":[{"title":"string","url":"https://example.com"}],"images":[]}
`;

// -------- Robust extractor --------
function extractText(env) {
  // Most common shortcut
  if (typeof env?.output_text === 'string' && env.output_text.trim()) return env.output_text.trim();

  // Try arrays under several common keys
  const candidates = [];
  if (Array.isArray(env?.output))   candidates.push(...env.output);
  if (Array.isArray(env?.response)) candidates.push(...env.response);
  if (Array.isArray(env?.choices))  candidates.push(...env.choices);
  if (env?.message)                 candidates.push(env.message);

  for (const item of candidates) {
    // item.content is often an array of blocks
    if (Array.isArray(item?.content)) {
      for (const block of item.content) {
        if (typeof block?.text === 'string' && block.text.trim()) return block.text.trim();
        if (typeof block?.output_text === 'string' && block.output_text.trim()) return block.output_text.trim();
      }
    }
    // nested message content
    const msgC = item?.message?.content;
    if (Array.isArray(msgC)) {
      for (const block of msgC) {
        if (typeof block?.text === 'string' && block.text.trim()) return block.text.trim();
      }
    }
    // direct
    if (typeof item?.text === 'string' && item.text.trim()) return item.text.trim();
    if (typeof item?.output_text === 'string' && item.output_text.trim()) return item.output_text.trim();
  }

  // Fallback last resort
  const mc = env?.message?.content;
  if (Array.isArray(mc)) {
    for (const block of mc) {
      if (typeof block?.text === 'string' && block.text.trim()) return block.text.trim();
    }
  }

  return null;
}

// -------- OpenAI call --------
async function callOpenAI({ useSearch, timeoutMs, prompt }) {
  const body = {
    model: 'gpt-5',
    tools: useSearch ? [{ type: 'web_search' }] : [],
    input: [
      { role: 'system', content: prompt },
      { role: 'user', content: 'Prioritise CS2 & LoL headlines with UK relevance.' },
    ],
    text: { format: { type: 'text' } }, // tools require text mode
    modalities: ['text']
  };

  const resp = await fetchWithTimeout('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }, timeoutMs);

  const raw = await resp.text();
  if (!resp.ok) {
    console.error(`❌ OpenAI HTTP ${resp.status} (${useSearch ? 'with' : 'without'} web_search) raw:`, raw.slice(0, 600));
    throw new Error(`OpenAI HTTP ${resp.status}`);
  }

  let env;
  try { env = JSON.parse(raw); } catch {
    console.error('❌ Non-JSON envelope (first 600 chars):', raw.slice(0, 600));
    throw new Error('OpenAI returned non-JSON envelope');
  }

  const text = extractText(env);
  if (!text) {
    console.error('❌ No content block found. Envelope preview:', JSON.stringify(env).slice(0, 900));
    throw new Error('No content from model');
  }

  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) {
    console.error('❌ Model did not return JSON. First 300 chars:\n', trimmed.slice(0, 300));
    throw new Error('Model did not return JSON');
  }

  return JSON.parse(trimmed);
}

// -------- Shape check --------
function ensureShape(p) {
  const missing = [];
  for (const k of ['kind','title','summary','tweet','article','sources','images']) if (!(k in p)) missing.push(k);
  if (missing.length) throw new Error('Missing keys: ' + missing.join(', '));
  if (!p.article?.markdown || typeof p.article.markdown !== 'string' || p.article.markdown.length < 200)
    throw new Error('article.markdown must be at least 200 characters');
  if (!Array.isArray(p.sources) || p.sources.length < 2)
    throw new Error('Need at least 2 sources');
  if (!Array.isArray(p.images))
    throw new Error('images must be an array (can be empty)');
}

// -------- Image cache --------
async function cacheImageToStorage(url, slug, i) {
  const res = await fetchWithTimeout(url, {}, IMAGE_TIMEOUT_MS);
  if (!res.ok) throw new Error(`image fetch ${res.status} ${url}`);
  const arr = new Uint8Array(await res.arrayBuffer());
  const type = res.headers.get('content-type') || 'image/jpeg';
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('gif') ? 'gif' : 'jpg';
  const path = `news/${new Date().toISOString().slice(0, 10)}/${slug}-${i}.${ext}`;

  const up = await supabase.storage.from('content').upload(path, arr, { contentType: type, upsert: true });
  if (!up || up.error) throw new Error(`storage upload: ${up?.error?.message || 'unknown'}`);

  const { data } = supabase.storage.from('content').getPublicUrl(path);
  return { storage_path: path, public_url: data.publicUrl };
}

// -------- Main --------
async function run() {
  console.log('🤖 Starting Frags & Fortunes News Agent...');

  let post, usedSearch = USE_SEARCH;

  // 1) Try WITH search (if enabled)
  try {
    post = await callOpenAI({ useSearch: USE_SEARCH, timeoutMs: OPENAI_TIMEOUT_MS, prompt: FAST_PROMPT });
    console.log(`✅ OpenAI returned (${USE_SEARCH ? 'with' : 'without'} web_search)`);
  } catch (e) {
    console.warn(`⚠️ First attempt failed (${USE_SEARCH ? 'with' : 'without'} search):`, String(e?.message || e));
    // If we initially used search, try without search next (catch ANY error, not just Timeout)
    if (USE_SEARCH) {
      usedSearch = false;
      try {
        post = await callOpenAI({ useSearch: false, timeoutMs: Math.min(OPENAI_TIMEOUT_MS, 60000), prompt: FAST_PROMPT });
        console.log('⚡ OpenAI returned WITHOUT web_search');
      } catch (e2) {
        console.warn('⚠️ No-search attempt failed:', String(e2?.message || e2));
        // 2) Last-resort tiny prompt to guarantee JSON
        post = await callOpenAI({ useSearch: false, timeoutMs: 45000, prompt: TINY_PROMPT });
        console.log('✨ OpenAI returned using tiny fallback prompt (no-search)');
      }
    } else {
      // We already were no-search; go tiny as last resort
      post = await callOpenAI({ useSearch: false, timeoutMs: 45000, prompt: TINY_PROMPT });
      console.log('✨ OpenAI returned using tiny fallback prompt (no-search)');
    }
  }

  // Validate (allow images to be empty)
  ensureShape(post);

  // Dedupe & slug
  const srcKey = (post.sources || []).map(s => s.url).sort().join('|');
  const unique_hash = md5(`${post.title}|${srcKey}`);
  const slug = slugify(post.title);

  // Cache images (up to MAX_IMAGES)
  const images = [];
  const list = Array.isArray(post.images) ? post.images.slice(0, MAX_IMAGES) : [];
  for (let i = 0; i < list.length; i++) {
    try {
      const cached = await cacheImageToStorage(list[i].url, slug, i + 1);
      images.push({ ...list[i], ...cached });
    } catch (e) {
      console.warn('⚠️ Image failed:', e.message);
      images.push({ ...list[i], storage_path: null, public_url: null, error: String(e) });
    }
  }

  // Upsert
  const { data, error } = await supabase
    .from('posts')
    .upsert({
      kind: post.kind || 'news',
      title: post.title,
      slug,
      summary: post.summary,
      tweet_text: post.tweet,
      discord_payload: null,
      article_markdown: post.article.markdown,
      images,
      sources: post.sources,
      league: post.league ?? null,
      teams: post.teams ?? null,
      tags: post.tags ?? null,
      unique_hash,
      status: 'ready',
      used_search: usedSearch
    }, { onConflict: 'unique_hash' })
    .select()
    .single();

  if (error) throw error;
  console.log(JSON.stringify({ ok: true, id: data.id, slug, used_search: usedSearch }, null, 2));
}

run().catch(err => {
  console.error(JSON.stringify({ ok: false, error: String(err) }, null, 2));
  process.exit(1);
});
