// news-agent.mjs
// Tries with web_search; on timeout, retries once without. Also supports USE_SEARCH env to force-enable/disable.

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

// -------- ENV --------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 90000);
const IMAGE_TIMEOUT_MS  = Number(process.env.IMAGE_TIMEOUT_MS  || 12000);
const MAX_IMAGES        = Number(process.env.MAX_IMAGES        || 1);
const USE_SEARCH_ENV    = (process.env.USE_SEARCH ?? "1").trim(); // "1" or "0"
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

// -------- PROMPT --------
const PROMPT = `
You are the Frags & Fortunes esports News agent.
Gather exactly ONE fresh, UK-relevant esports story (CS2 or LoL preferred).

Rules:
- Timezone: Europe/London.
- Return ONLY a compact JSON object (no comments, no code fences).
- Prefer 2–3 credible sources (HLTV, BLIX, DotEsports, esports.gg, official sites).
- 1–2 DIRECT https image URLs (press kit/official/CC).

JSON structure:
{
  "kind": "news",
  "league": "string",
  "teams": ["string", ...],
  "tags": ["string", ...],
  "title": "string",
  "summary": "string",
  "tweet": "string",
  "article": { "markdown": "string (>=200 chars)" },
  "sources": [ { "title": "string", "url": "https://..." }, ... ],
  "images": [ { "url": "https://..." }, ... ]
}
Return only the JSON object.
`.trim();

// -------- OpenAI call --------
async function callOpenAI({ useSearch, timeoutMs }) {
  const body = {
    model: 'gpt-5',
    tools: useSearch ? [{ type: 'web_search' }] : [],
    input: [
      { role: 'system', content: PROMPT },
      { role: 'user', content: 'Prioritise CS2 & LoL headlines with UK relevance.' },
    ],
    text: { format: { type: 'text' } }, // tools require text mode
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
    console.error(`❌ OpenAI HTTP ${resp.status} (${useSearch ? 'with' : 'without'} web_search) raw:`, raw);
    throw new Error(`OpenAI HTTP ${resp.status}`);
  }

  const env = JSON.parse(raw);
  const text =
    env.output_text ??
    env.output?.[0]?.content?.[0]?.text ??
    env.message?.content?.[0]?.text;

  if (!text) throw new Error('No content from model');

  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) throw new Error(`Model did not return JSON: ${trimmed.slice(0, 300)}`);

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
  if (!Array.isArray(p.images) || p.images.length < 1)
    throw new Error('Need at least 1 image');
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

  try {
    // Attempt with configured USE_SEARCH first
    post = await callOpenAI({ useSearch: USE_SEARCH, timeoutMs: OPENAI_TIMEOUT_MS });
    console.log(`✅ OpenAI returned (${USE_SEARCH ? 'with' : 'without'} web_search)`);
  } catch (e) {
    const msg = String(e?.message || e);
    if (USE_SEARCH && /AbortError|Timeout/i.test(msg)) {
      console.warn('⏱️ Timed out WITH web_search. Retrying WITHOUT web_search…');
      usedSearch = false;
      post = await callOpenAI({ useSearch: false, timeoutMs: Math.min(OPENAI_TIMEOUT_MS, 60000) });
      console.log('⚡ OpenAI returned WITHOUT web_search');
    } else {
      throw e;
    }
  }

  ensureShape(post);

  const srcKey = (post.sources || []).map(s => s.url).sort().join('|');
  const unique_hash = md5(`${post.title}|${srcKey}`);
  const slug = slugify(post.title);

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
