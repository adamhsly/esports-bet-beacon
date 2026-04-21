import { supabase } from '@/integrations/supabase/client';
import type {
  PickemsSlate,
  PickemsSlateMatch,
  PickemsEntry,
  PickemsPick,
  PickemsEnrichedMatch,
  PickemsMatchTeam,
} from '@/types/pickems';

/**
 * Extract team A/B from the pandascore_matches.teams JSON.
 * teams may be an array of opponents or { opponent: {...} } wrappers.
 */
export function extractTeams(raw: any): { a: PickemsMatchTeam | null; b: PickemsMatchTeam | null } {
  if (!raw) return { a: null, b: null };
  let arr: any[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (Array.isArray(raw?.opponents)) {
    arr = raw.opponents;
  }
  const norm = (entry: any): PickemsMatchTeam | null => {
    if (!entry) return null;
    const t = entry.opponent ?? entry.team ?? entry;
    if (!t || (t.id === undefined && !t.name)) return null;
    return {
      id: t.id ?? t.team_id ?? t.slug ?? t.name,
      name: t.name ?? t.acronym ?? 'Team',
      image_url: t.image_url ?? t.logo ?? null,
      acronym: t.acronym ?? null,
    };
  };
  return { a: norm(arr[0]), b: norm(arr[1]) };
}

export async function fetchSlates(): Promise<PickemsSlate[]> {
  const { data, error } = await (supabase as any)
    .from('pickems_slates')
    .select('*')
    .neq('status', 'draft')
    .order('start_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAllSlatesAdmin(): Promise<PickemsSlate[]> {
  const { data, error } = await (supabase as any)
    .from('pickems_slates')
    .select('*')
    .order('start_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchSlate(slateId: string): Promise<PickemsSlate | null> {
  const { data, error } = await (supabase as any)
    .from('pickems_slates')
    .select('*')
    .eq('id', slateId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchSlateMatches(slateId: string): Promise<PickemsEnrichedMatch[]> {
  const { data: links, error } = await (supabase as any)
    .from('pickems_slate_matches')
    .select('match_id, display_order')
    .eq('slate_id', slateId)
    .order('display_order', { ascending: true });
  if (error) throw error;

  const matchIds = (links ?? []).map((l: any) => l.match_id);
  if (matchIds.length === 0) return [];

  const { data: matches, error: mErr } = await (supabase as any)
    .from('pandascore_matches')
    .select('match_id, esport_type, teams, start_time, status, tournament_name, league_name, winner_id, draw, number_of_games')
    .in('match_id', matchIds);
  if (mErr) throw mErr;

  const orderMap = new Map<string, number>();
  (links ?? []).forEach((l: any) => orderMap.set(l.match_id, l.display_order));

  const enriched: PickemsEnrichedMatch[] = (matches ?? []).map((m: any) => {
    const { a, b } = extractTeams(m.teams);
    return {
      match_id: m.match_id,
      esport_type: m.esport_type,
      teams: m.teams,
      team_a: a,
      team_b: b,
      start_time: m.start_time,
      status: m.status,
      tournament_name: m.tournament_name,
      league_name: m.league_name,
      winner_id: m.winner_id,
      draw: m.draw,
      number_of_games: m.number_of_games,
      display_order: orderMap.get(m.match_id) ?? 0,
    };
  });
  enriched.sort((x, y) => (x.display_order ?? 0) - (y.display_order ?? 0));
  return enriched;
}

export async function fetchUserEntry(slateId: string, userId: string): Promise<{ entry: PickemsEntry | null; picks: PickemsPick[] }> {
  const { data: entry } = await (supabase as any)
    .from('pickems_entries')
    .select('*')
    .eq('slate_id', slateId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!entry) return { entry: null, picks: [] };

  const { data: picks } = await (supabase as any)
    .from('pickems_picks')
    .select('*')
    .eq('entry_id', entry.id);

  return { entry, picks: picks ?? [] };
}

export async function fetchLeaderboard(slateId: string, limit = 100) {
  const { data, error } = await (supabase as any)
    .from('pickems_entries')
    .select('id, user_id, total_score, correct_picks, total_picks, submitted_at, streak_bonus, longest_streak, tiebreaker_total_maps, tiebreaker_actual, tiebreaker_delta')
    .eq('slate_id', slateId)
    .order('total_score', { ascending: false })
    .order('tiebreaker_delta', { ascending: true, nullsFirst: false })
    .order('submitted_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export function isMatchLocked(startTime: string | null, status: string | null): boolean {
  if (!startTime) return false;
  const finished = status === 'finished' || status === 'running' || status === 'live' || status === 'cancelled';
  if (finished) return true;
  return new Date(startTime).getTime() <= Date.now();
}
