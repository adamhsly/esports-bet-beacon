// news-agent.mjs
// GitHub Actions runner: GPT-5 + web_search → JSON → Supabase Storage + DB.

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

// ---------- ENV ----------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Tunables
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 60000);
const IMAGE_TIMEOUT_MS  = Number(process.env.IMAGE_TIMEOUT_MS  || 12000);
const MAX_IMAGES        = Number(process.env.MAX_IMAGES        || 1);

// Startup diagnostics (safe)
console.log('🔧 Env check:', {
  has_SUPABASE_URL: !!SUPABASE_URL,
  has_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
  has_OPENAI_API_KEY: !!OPENAI_API_KEY,
  OPENAI_TIMEOUT_MS,
  IMAGE_TIMEOUT_MS,
  MAX_IMAGES,
});

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error('❌ Missing required env vars. Please set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------- HELPERS ----------
function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function md5(str) {
  return createHash('md5').update(Buffer.from(str, 'utf8')).digest('hex');
}
async function fetchWithTimeout(input, init = {}, ms = 45000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(new DOMException('Timeout', 'AbortError')), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// ---------- PROMPT ----------
const PROMPT = `
You are the Frags & Fortunes esports News agent.
Use web_search to gather exactly ONE fresh, UK-relevant esports story (CS2 or LoL preferred).

Rules:
- Timezone: Europe/London (e.g., 30 September 2025, 14:30 BST).
- Return ONLY a compact JSON object (no comments, no code fences).
- Sources: 2–3 credible links (HLTV, BLIX, DotEsports, esports.gg, official sites).
- Images: 1–2 DIRECT https image URLs (press kit/official/CC).

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
`;

// ---------- OPENAI CALL ----------
async function callOpenAI() {
  const body = {
    model: 'gpt-5',
    tools: [{ type: 'web_search' }],
    input: [
      { role: 'system', content: PROMPT },
      { role: 'user', content: 'Prioritise CS2 & LoL headlines with UK relevance.' },
    ],
    // web_search requires "text" mode
    text: { format: { type: 'text' } },
  };

  const resp = await fetchWithTimeout('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }, OPENAI_TIMEOUT_MS);

  const raw = await resp.text();
  if (!resp.ok) {
    console.error('❌ OpenAI error raw:', raw);
    throw new Error(`OpenAI HTTP ${resp.status}`);
  }

  let env;
  try { env = JSON.parse(raw); }
  catch { throw new Error('OpenAI returned non-JSON envelope'); }

  const text =
    env.output_text ??
    env.output?.[0]?.content?.[0]?.text ??
    env.message?.content?.[0]?.text;

  if (!text) throw new Error('No content from model');

  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) throw new Error(`Model did not return JSON: ${trimmed.slice(0, 300)}`);
  return JSON.parse(trimmed);
}

// ---------- VALIDATE ----------
function ensureShape(p) {
  const missing = [];
  for (const key of ['kind','title','summary','tweet','article','sources','images']) {
    if (!(key in p)) missing.push(key);
  }
  if (missing.length) throw new Error('Missing keys: ' + missing.join(', '));
  if (!p.article?.markdown || typeof p.article.markdown !== 'string' || p.article.markdown.length < 200)
    throw new Error('article.markdown must be at least 200 characters');
  if (!Array.isArray(p.sources) || p.sources.length < 2)
    throw new Error('Need at least 2 sources');
  if (!Array.isArray(p.images) || p.images.length < 1)
    throw new Error('Need at least 1 image');
}

// ---------- IMAGE CACHE ----------
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

// ---------- MAIN ----------
async function run() {
  console.log('🤖 Starting Frags & Fortunes News Agent...');
  const post = await callOpenAI();
  ensureShape(post);

  const srcKey = (post.sources || []).map((s) => s.url).sort().join('|');
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
    }, { onConflict: 'unique_hash' })
    .select()
    .single();

  if (error) throw error;
  console.log(JSON.stringify({ ok: true, id: data.id, slug }, null, 2));
}

run().catch((err) => {
  // Always print a clear, one-line JSON error so Actions shows it in the log
  console.error(JSON.stringify({ ok: false, error: String(err) }, null, 2));
  process.exit(1);
});
