// resolveLogoUrl.ts
import { createClient } from '@supabase/supabase-js';

export type TeamType = 'pro' | 'amateur';

interface ResolveLogoOptions {
  supabase: ReturnType<typeof createClient>;
  teamType: TeamType;
  teamId?: string | number | null;
  teamName?: string | null;
}

type CacheEntry = { url: string | null; timestamp: number };

// ---- Caching (memory + optional localStorage) ----
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const memCache = new Map<string, CacheEntry>();

const hasLS = typeof window !== 'undefined' && !!(window as any).localStorage;

function now() {
  return Date.now();
}

function getCacheKey(teamType: TeamType, teamId?: string | number | null, teamName?: string | null): string {
  const normalizedId = teamId ? String(teamId) : '';
  const normalizedName = normalizeName(teamName);
  return `logo:${teamType}:${normalizedId || normalizedName}`;
}

function readMem(key: string): string | null {
  const hit = memCache.get(key);
  if (!hit) return null;
  if (now() - hit.timestamp < CACHE_DURATION) return hit.url;
  memCache.delete(key);
  return null;
}

function writeMem(key: string, url: string | null) {
  memCache.set(key, { url, timestamp: now() });
}

function readLS(key: string): string | null {
  if (!hasLS) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (now() - parsed.timestamp < CACHE_DURATION) return parsed.url;
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('Logo cache: localStorage read error', e);
  }
  return null;
}

function writeLS(key: string, url: string | null) {
  if (!hasLS) return;
  try {
    const entry: CacheEntry = { url, timestamp: now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.warn('Logo cache: localStorage write error', e);
  }
}

// ---- Utils ----
function normalizeName(s?: string | null) {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function isValidHttpsUrl(url?: string | null) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

function pickFirstUrl(...candidates: Array<string | null | undefined>): string | null {
  return (candidates.find(isValidHttpsUrl) as string) ?? null;
}

function toBase64Unicode(str: string) {
  // btoa fails on non-ASCII; this safely encodes Unicode
  // @ts-ignore
  return btoa(unescape(encodeURIComponent(str)));
}

// ---- Pro (Pandascore) lookup ----
async function getProTeamLogo(
  supabase: ReturnType<typeof createClient>,
  teamId: string
): Promise<string | null> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // 1) Try numeric id containment on the JSONB teams array
  let matches: any[] | null = null;
  const n = Number(teamId);
  const canNumeric = !Number.isNaN(n);

  if (canNumeric) {
    const containsNumeric = JSON.stringify([{ opponent: { id: n } }]);
    const { data, error } = await supabase
      .from('pandascore_matches')
      .select('teams,start_time,status')
      .gte('start_time', sixMonthsAgo.toISOString())
      .in('status', ['finished', 'running', 'not_started', 'upcoming'])
      .filter('teams', 'cs', containsNumeric)
      .order('start_time', { ascending: false })
      .limit(60);
    if (!error) matches = data;
  }

  // 2) Fallback: string id containment (some payloads store ids as strings)
  if (!matches || matches.length === 0) {
    const containsString = JSON.stringify([{ opponent: { id: String(teamId) } }]);
    const { data, error } = await supabase
      .from('pandascore_matches')
      .select('teams,start_time,status')
      .gte('start_time', sixMonthsAgo.toISOString())
      .in('status', ['finished', 'running', 'not_started', 'upcoming'])
      .filter('teams', 'cs', containsString)
      .order('start_time', { ascending: false })
      .limit(80);
    if (!error) matches = data;
  }

  // 3) Last-ditch: recent matches (no contains) then scan in JS
  if (!matches || matches.length === 0) {
    const { data } = await supabase
      .from('pandascore_matches')
      .select('teams,start_time,status')
      .gte('start_time', sixMonthsAgo.toISOString())
      .in('status', ['finished', 'running', 'not_started', 'upcoming'])
      .order('start_time', { ascending: false })
      .limit(120);
    matches = data ?? null;
  }

  // Extract image from the matching team object
  for (const m of matches ?? []) {
    const teams = Array.isArray(m?.teams) ? m.teams : [];
    for (const t of teams) {
      if (t?.type === 'Team' && t?.opponent) {
        const oid = String(t.opponent.id);
        if (oid === teamId) {
          const url = pickFirstUrl(t.opponent.image_url, t.opponent.logo, t.opponent.image);
          if (url) return url;
        }
      }
    }
  }

  // Optional: fallback to a teams table if present
  try {
    if (canNumeric) {
      const { data } = await supabase
        .from('pandascore_teams')
        .select('image_url,logo,id')
        .eq('id', n)
        .limit(1)
        .maybeSingle();
      const url = pickFirstUrl(String(data?.image_url || ''), String(data?.logo || ''));
      if (url) return url;
    }
  } catch {}

  return null;
}

// ---- Amateur (Faceit) lookup ----
async function getAmateurTeamLogo(
  supabase: ReturnType<typeof createClient>,
  teamId: string,
  teamName?: string | null
): Promise<string | null> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const normId = normalizeName(teamId);
  const normName = normalizeName(teamName);

  // 1) Try consolidated RPC if it exists
  try {
    const { data: faceitTeams } = await supabase.rpc('get_all_faceit_teams');
    if (Array.isArray(faceitTeams)) {
      // Prefer exact id match, then name
      const byId = faceitTeams.find((t: any) => normalizeName(t.team_id) === normId);
      const byName = faceitTeams.find((t: any) => normalizeName(t.team_name) === normName);
      const pick = byId ?? byName;
      if (pick) {
        const url = pickFirstUrl(pick.logo_url, pick.avatar, pick.image, pick.logo);
        if (url) return url;
      }
    }
  } catch (e) {
    // non-fatal
  }

  // 2) Faceit matches (scan factions) within 6 months
  const { data: matches } = await supabase
    .from('faceit_matches')
    .select('teams,started_at')
    .gte('started_at', sixMonthsAgo.toISOString())
    .not('teams', 'is', null)
    .order('started_at', { ascending: false })
    .limit(200);

  for (const m of matches ?? []) {
    const teams = (m as any)?.teams;
    for (const key of ['faction1', 'faction2'] as const) {
      const f = teams?.[key];
      if (!f) continue;
      const fName = normalizeName(f.name ?? f.team?.name);
      const fIdLike = normalizeName(f.team_id ?? f.slug ?? fName);

      // match by id-like OR name
      if ((normId && fIdLike === normId) || (normName && fName === normName)) {
        const url = pickFirstUrl(
          f.avatar, f.image, f.logo,
          f?.team?.avatar, f?.team?.image, f?.team?.logo
        );
        if (url) return url;
      }
    }
  }

  // 3) Optional direct teams table
  try {
    const { data } = await supabase
      .from('faceit_teams')
      .select('logo_url,avatar,image,logo,team_id,team_name')
      .or(`team_id.eq.${String(teamId)},team_name.ilike.${teamName ? `%${teamName}%` : ''}`)
      .limit(1)
      .maybeSingle();
    const url = pickFirstUrl(String(data?.logo_url || ''), String(data?.avatar || ''), String(data?.image || ''), String(data?.logo || ''));
    if (url) return url;
  } catch {}

  return null;
}

// ---- Public API ----
export async function getTeamLogoUrl(opts: ResolveLogoOptions): Promise<string | null> {
  const { supabase, teamType } = opts;
  const normalizedTeamId = opts.teamId ? String(opts.teamId) : '';
  const normalizedTeamName = normalizeName(opts.teamName);
  const cacheKey = getCacheKey(teamType, normalizedTeamId, normalizedTeamName);

  // Cache: memory first, then localStorage
  const memHit = readMem(cacheKey);
  if (memHit !== null) return memHit;

  const lsHit = readLS(cacheKey);
  if (lsHit !== null) {
    writeMem(cacheKey, lsHit);
    return lsHit;
  }

  let logoUrl: string | null = null;
  try {
    if (teamType === 'pro' && normalizedTeamId) {
      logoUrl = await getProTeamLogo(supabase, normalizedTeamId);
    } else if (teamType === 'amateur' && (normalizedTeamId || normalizedTeamName)) {
      logoUrl = await getAmateurTeamLogo(supabase, normalizedTeamId, normalizedTeamName);
    }
  } catch (error) {
    console.warn(`Error resolving logo for ${teamType} (${normalizedTeamId || normalizedTeamName}):`, error);
  }

  writeMem(cacheKey, logoUrl);
  writeLS(cacheKey, logoUrl);

  return logoUrl;
}

// ---- Canvas helpers ----
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isValidHttpsUrl(url)) return reject(new Error(`Invalid image URL: ${url}`));
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url!;
  });
}

export function getPlaceholderLogo(teamName?: string): string {
  const initial = (teamName ? teamName.charAt(0) : '?').toUpperCase();
  const svg = `
    <svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" fill="#374151" rx="12"/>
      <text x="60" y="75" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="#9CA3AF">${initial}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;base64,${toBase64Unicode(svg)}`;
}

export function proxifyIfNeeded(url?: string | null) {
  if (!url) return '';
  try {
    const u = new URL(url, location.origin);
    // same-origin is fine
    if (u.origin === location.origin) return u.href;
    const base = import.meta.env.VITE_SUPABASE_URL;
    if (!base) return url;
    return `${base}/functions/v1/public-image-proxy?url=${encodeURIComponent(u.href)}`;
  } catch {
    return url;
  }
}
