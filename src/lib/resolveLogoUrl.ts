import { createClient } from '@supabase/supabase-js';

export type TeamType = 'pro' | 'amateur';

interface ResolveLogoOptions {
  supabase: ReturnType<typeof createClient> | any;
  teamType: TeamType;
  teamId?: string | number | null;
  teamName?: string | null;
  forCanvas?: boolean;
}

/* ----------------- utils ----------------- */

function isValidHttpsUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try { return new URL(url).protocol === 'https:'; } catch { return false; }
}

function normalizeName(name?: string | null) {
  return (name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Derive Supabase origin from the *actual* client (no env required). */
function getSupabaseOriginFromClient(client: any): string | null {
  try {
    const { data: { publicUrl } } = client.storage.from('shares').getPublicUrl('__probe__');
    return new URL(publicUrl).origin;
  } catch {
    return null;
  }
}

/** Build a CORS-safe proxy URL (Edge Function must be public). */
function proxifyForCanvas(url?: string | null, client?: any): string | null {
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return url; // relative/data urls are fine
  try {
    const supaOrigin = getSupabaseOriginFromClient(client);
    if (!supaOrigin) return url;
    const u = new URL(url);
    if (u.origin === supaOrigin) return u.href; // already same-origin
    return `${supaOrigin}/functions/v1/public-image-proxy?url=${encodeURIComponent(u.href)}`;
  } catch {
    return url;
  }
}

/* ----------------- lookups ----------------- */

async function getProTeamLogo(
  supabase: any,
  teamId: string,
): Promise<string | null> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const numericId = Number(teamId);
  const containsNumeric = JSON.stringify([{ opponent: { id: numericId } }]);
  const containsString  = JSON.stringify([{ opponent: { id: String(teamId) } }]);

  // IMPORTANT: the third arg to .filter('cs', ...) **must** be a JSON string
  // otherwise it becomes cs.{[object Object]} and PostgREST returns 400.
  let { data: matches } = await supabase
    .from('pandascore_matches')
    .select('teams,start_time,status')
    .gte('start_time', sixMonthsAgo.toISOString())
    .in('status', ['finished','running','not_started','upcoming'])
    .filter('teams', 'cs', containsNumeric)
    .order('start_time', { ascending: false })
    .limit(60);

  if (!matches?.length) {
    const resp = await supabase
      .from('pandascore_matches')
      .select('teams,start_time,status')
      .gte('start_time', sixMonthsAgo.toISOString())
      .in('status', ['finished','running','not_started','upcoming'])
      .filter('teams', 'cs', containsString)
      .order('start_time', { ascending: false })
      .limit(80);
    matches = resp.data;
  }

  if (!matches?.length) return null;

  for (const m of matches) {
    if (!Array.isArray(m?.teams)) continue;
    for (const t of m.teams as any[]) {
      if (t?.type !== 'Team' || !t?.opponent) continue;
      const opp = t.opponent;
      const oppId = String(opp?.id ?? '');
      const oppSlug = String(opp?.slug ?? '');

      if (oppId === String(teamId) || oppId === String(numericId) || oppSlug === String(teamId)) {
        const candidate = opp.image_url || opp.logo;
        if (isValidHttpsUrl(candidate)) return candidate;
      }
    }
  }
  return null;
}

async function getAmateurTeamLogo(
  supabase: any,
  teamId: string | undefined,
  teamName?: string | null
): Promise<string | null> {
  // 1) Catalog RPC if available
  try {
    const { data: faceitTeams } = await supabase.rpc('get_all_faceit_teams');
    if (Array.isArray(faceitTeams)) {
      const key = teamId || normalizeName(teamName);
      const hit = faceitTeams.find((t: any) => String(t.team_id) === String(key));
      if (hit?.logo_url && isValidHttpsUrl(hit.logo_url)) return hit.logo_url;
    }
  } catch {}

  // 2) Fallback — scan recent matches for faction avatars
  const { data: matches } = await supabase
    .from('faceit_matches')
    .select('teams, started_at')
    .not('teams', 'is', null)
    .order('started_at', { ascending: false })
    .limit(60);

  if (!matches?.length) return null;

  const targetName = normalizeName(teamName);
  for (const m of matches) {
    const factions = [m?.teams?.faction1, m?.teams?.faction2].filter(Boolean);
    for (const f of factions as any[]) {
      const fName = normalizeName(f?.name);
      const idMatch = teamId && (String(f?.name) === String(teamId));
      const nameMatch = targetName && fName === targetName;
      if (idMatch || nameMatch) {
        const logo = f?.avatar || f?.image || f?.logo;
        if (isValidHttpsUrl(logo)) return logo;
      }
    }
  }
  return null;
}

/* ----------------- public API ----------------- */

export async function getTeamLogoUrl(opts: ResolveLogoOptions): Promise<string | null> {
  const { supabase, teamType, teamId, teamName, forCanvas } = opts;

  let resolved: string | null = null;

  if (teamType === 'pro' && teamId != null) {
    resolved = await getProTeamLogo(supabase, String(teamId));
  } else if (teamType === 'amateur') {
    resolved = await getAmateurTeamLogo(supabase, teamId ? String(teamId) : undefined, teamName);
  }

  if (forCanvas && resolved) {
    resolved = proxifyForCanvas(resolved, supabase) ?? resolved;
  }

  return resolved;
}

/** Preload an image safely for canvas use */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/** Simple placeholder SVG */
export function getPlaceholderLogo(teamName?: string): string {
  const initial = (teamName?.charAt(0) || '?').toUpperCase();
  const svg = `
    <svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" fill="#374151" rx="12"/>
      <text x="60" y="75" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="#9CA3AF">${initial}</text>
    </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
