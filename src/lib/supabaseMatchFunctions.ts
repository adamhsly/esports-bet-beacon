// src/lib/supabaseMatchFunctions.ts
import { supabase } from '@/integrations/supabase/client';
import { MatchInfo } from '@/components/MatchCard';
import { MatchCountBreakdown } from '@/utils/matchCountUtils';

/* ────────────────────────────────────────────────────────────────────────────
   Types (DB result shapes)
────────────────────────────────────────────────────────────────────────────── */
interface MatchCountRow {
  match_date: string;                 // 'YYYY-MM-DD'
  source: 'faceit' | 'pandascore';
  match_count: number;
}

interface MatchCardsDayRow {
  source: 'amateur' | 'professional';
  match_date: string;                 // 'YYYY-MM-DD'
  start_time: string;                 // ISO timestamptz
  match_id: string;

  esport_type: string | null;
  tournament: string | null;
  status: string | null;
  best_of: number | null;

  team1_id: string | null;
  team1_name: string | null;
  team1_logo: string | null;

  team2_id: string | null;
  team2_name: string | null;
  team2_logo: string | null;

  league_name: string | null;
}

/* ────────────────────────────────────────────────────────────────────────────
   Utilities
────────────────────────────────────────────────────────────────────────────── */
function dayRangeLocal(date: Date) {
  // Build [local midnight, next local midnight) and return UTC ISO strings
  const start = new Date(date);
  start.setHours(0, 0, 0, 0); // local midnight
  const end = new Date(start);
  end.setDate(end.getDate() + 1); // next local midnight
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

/* ────────────────────────────────────────────────────────────────────────────
   ✅ Optimized helpers
────────────────────────────────────────────────────────────────────────────── */

/** Pre-aggregated counts from daily_match_counts for a window around targetDate */
export async function getDayCounts(targetDate: Date, windowDays: number = 7) {
  const ymd = targetDate.toISOString().slice(0, 10);
  const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

  const from = new Date(ymd);
  from.setDate(from.getDate() - windowDays);

  const to = new Date(ymd);
  to.setDate(to.getDate() + (windowDays + 1)); // half-open

  const { data, error } = await supabase
    .from('daily_match_counts')
    .select('match_date, source, match_count')
    .gte('match_date', toDateStr(from))
    .lt('match_date', toDateStr(to))
    .order('match_date', { ascending: true })
    .order('source', { ascending: true });

  if (error) {
    console.error('❌ getDayCounts error:', error);
    throw error;
  }
  return (data || []) as MatchCountRow[];
}

interface GetMatchesForDateParams {
  date: Date;
  limit?: number;
  cursorStartTime?: string;                 // ISO for keyset pagination
  source?: 'amateur' | 'professional' | 'all';
  esportType?: string | 'all';
}

/**
 * Lightweight rows for a single local day from match_cards_day.
 * Uses a **local-day** window to avoid UTC drift; filters TBD/TBC & cancelled.
 */
export async function getMatchesForDate({
  date,
  limit = 100,
  cursorStartTime,
  source = 'all',
  esportType = 'all',
}: GetMatchesForDateParams): Promise<MatchInfo[]> {
  const { startISO, endISO } = dayRangeLocal(date);

  let query = supabase
    .from('match_cards_day')
    .select('*')
    .gte('start_time', startISO)
    .lt('start_time', endISO)
    .not('team1_name', 'ilike', '%TBD%')
    .not('team2_name', 'ilike', '%TBD%')
    .not('team1_name', 'ilike', '%TBC%')
    .not('team2_name', 'ilike', '%TBC%')
    .not('status', 'ilike', 'cancel%')
    .not('status', 'ilike', 'abort%');

  if (cursorStartTime) query = query.lt('start_time', cursorStartTime);
  if (source !== 'all') query = query.eq('source', source);
  if (esportType !== 'all') query = query.ilike('esport_type', `%${esportType}%`);

  const { data, error } = await query
    .order('start_time', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ getMatchesForDate error:', error, { startISO, endISO, date: date.toString() });
    throw error;
  }

  const rows = (data || []) as MatchCardsDayRow[];

  // Map rows -> MatchInfo (return **raw** match_id; no prefixes)
  const matches: MatchInfo[] = rows.map((r) => ({
    id: r.match_id,
    source: r.source,
    startTime: r.start_time,
    tournament: r.tournament || undefined,
    tournament_name: r.tournament || undefined,
    league_name: r.league_name || undefined,
    esportType: r.esport_type || undefined,
    bestOf: r.best_of ?? undefined,
    status: r.status || undefined,
    rawData: null,
    faceitData: null,
    teams: [
      { id: r.team1_id || undefined, name: r.team1_name || 'Team 1', logo: r.team1_logo || '/placeholder.svg' },
      { id: r.team2_id || undefined, name: r.team2_name || 'Team 2', logo: r.team2_logo || '/placeholder.svg' },
    ] as any,
  }));

  return matches;
}

/* ────────────────────────────────────────────────────────────────────────────
   Legacy helpers (kept for compatibility while you migrate)
────────────────────────────────────────────────────────────────────────────── */
interface MatchCountResult {
  match_date: string;
  source: string;
  match_count: number;
}

interface FaceitMatchResult {
  match_date: string;
  id: string;
  match_id: string;
  game: string;
  region: string;
  competition_name: string;
  competition_type: string;
  organized_by: string;
  status: string;
  started_at: string;
  finished_at: string;
  configured_at: string;
  calculate_elo: boolean;
  version: number;
  teams: any;
  voting: any;
  faceit_data: any;
  raw_data: any;
  created_at: string;
  updated_at: string;
  scheduled_at: string;
  championship_stream_url: string;
  championship_raw_data: any;
  match_phase: string;
  current_round: number;
  round_timer_seconds: number;
  overtime_rounds: number;
  live_team_scores: any;
  maps_played: any;
  round_results: any;
  live_player_status: any;
  kill_feed: any;
  economy_data: any;
  objectives_status: any;
  auto_refresh_interval: number;
  last_live_update: string;
}

interface PandaScoreMatchResult {
  match_date: string;
  id: string;
  match_id: string;
  esport_type: string;
  teams: any;
  start_time: string;
  end_time: string;
  tournament_id: string;
  tournament_name: string;
  league_id: string;
  league_name: string;
  serie_id: string;
  serie_name: string;
  status: string;
  match_type: string;
  number_of_games: number;
  raw_data: any;
  created_at: string;
  updated_at: string;
  last_synced_at: string;
  slug: string;
  draw: boolean;
  forfeit: boolean;
  original_scheduled_at: string;
  rescheduled: boolean;
  detailed_stats: boolean;
  winner_id: string;
  winner_type: string;
  videogame_id: string;
  videogame_name: string;
  stream_url_1: string;
  stream_url_2: string;
  modified_at: string;
  team_a_player_ids: any;
  team_b_player_ids: any;
  row_id: number;
}

/** Legacy RPC counts; prefer getDayCounts() */
export async function getMatchCountsAroundDate(targetDate: Date): Promise<Record<string, MatchCountBreakdown>> {
  try {
    const [faceitResult, pandascoreResult] = await Promise.all([
      (supabase.rpc as any)('faceit_get_match_counts_around_date', { target_date: targetDate.toISOString() }),
      (supabase.rpc as any)('pandascore_get_match_counts_around_date', { target_date: targetDate.toISOString() }),
    ]);

    const faceitCounts = Array.isArray(faceitResult.data) ? (faceitResult.data as MatchCountResult[]) : [];
    const pandascoreCounts = Array.isArray(pandascoreResult.data) ? (pandascoreResult.data as MatchCountResult[]) : [];

    const combined: Record<string, MatchCountBreakdown> = {};
    for (const c of faceitCounts) {
      const k = c.match_date;
      combined[k] ??= { total: 0, professional: 0, amateur: 0, live: 0, upcoming: 0 };
      combined[k].total += c.match_count;
      combined[k].amateur += c.match_count;
    }
    for (const c of pandascoreCounts) {
      const k = c.match_date;
      combined[k] ??= { total: 0, professional: 0, amateur: 0, live: 0, upcoming: 0 };
      combined[k].total += c.match_count;
      combined[k].professional += c.match_count;
    }
    return combined;
  } catch (error) {
    console.error('❌ getMatchCountsAroundDate error:', error);
    return {};
  }
}

/** Legacy convenience: totals from breakdown */
export function getTotalMatchCountsByDate(
  matchCountBreakdown: Record<string, MatchCountBreakdown>
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const k of Object.keys(matchCountBreakdown)) totals[k] = matchCountBreakdown[k].total;
  return totals;
}

/* ────────────────────────────────────────────────────────────────────────────
   Legacy: heavy ±7d RPC fetches (prefer getMatchesForDate)
────────────────────────────────────────────────────────────────────────────── */
function transformFaceitMatch(match: FaceitMatchResult): MatchInfo {
  const teams = match.teams || {};
  return {
    id: `faceit_${match.match_id}`,
    teams: [
      { name: teams.faction1?.name || 'Team 1', logo: teams.faction1?.avatar || '/placeholder.svg', id: teams.faction1?.faction_id || `faceit_team_${match.match_id}_1` },
      { name: teams.faction2?.name || 'Team 2', logo: teams.faction2?.avatar || '/placeholder.svg', id: teams.faction2?.faction_id || `faceit_team_${match.match_id}_2` },
    ] as any,
    startTime: match.started_at || match.scheduled_at,
    tournament: match.competition_name || 'FACEIT Match',
    esportType: match.game,
    bestOf: match.raw_data?.best_of || 3,
    source: 'amateur',
    status: match.status,
    faceitData: match.faceit_data,
    rawData: match.raw_data,
  };
}

function transformPandaScoreMatch(match: PandaScoreMatchResult): MatchInfo {
  const teams = match.teams || [];
  const team1 = Array.isArray(teams) && teams[0]?.opponent ? teams[0].opponent : {};
  const team2 = Array.isArray(teams) && teams[1]?.opponent ? teams[1].opponent : {};
  return {
    id: `pandascore_${match.match_id}`,
    teams: [
      { name: team1.name || 'Team 1', logo: team1.image_url || '/placeholder.svg', id: team1.id?.toString() || `pandascore_team_${match.match_id}_1` },
      { name: team2.name || 'Team 2', logo: team2.image_url || '/placeholder.svg', id: team2.id?.toString() || `pandascore_team_${match.match_id}_2` },
    ] as any,
    startTime: match.start_time,
    tournament: match.tournament_name || match.league_name || 'Professional Tournament',
    tournament_name: match.tournament_name,
    league_name: match.league_name,
    esportType: match.esport_type,
    bestOf: match.number_of_games || 3,
    source: 'professional',
    status: match.status,
    rawData: match.raw_data,
  };
}

/** Legacy: ±7 days via RPC; prefer getMatchesForDate */
export async function getMatchesAroundDate(targetDate: Date): Promise<MatchInfo[]> {
  try {
    const [faceitResult, pandascoreResult] = await Promise.all([
      (supabase.rpc as any)('get_faceit_matches_around_date', { target_date: targetDate.toISOString() }),
      (supabase.rpc as any)('get_pandascore_matches_around_date', { target_date: targetDate.toISOString() }),
    ]);

    const faceitMatches = Array.isArray(faceitResult.data) ? (faceitResult.data as FaceitMatchResult[]) : [];
    const pandascoreMatches = Array.isArray(pandascoreResult.data) ? (pandascoreResult.data as PandaScoreMatchResult[]) : [];

    const transformedFaceit = faceitMatches.map(transformFaceitMatch);
    const transformedPandaScore = pandascoreMatches.map(transformPandaScoreMatch);

    const combined = [...transformedFaceit, ...transformedPandaScore];

    // Strip TBD/TBC and finished FACEIT BYE
    const filtered = combined.filter((match) => {
      const names = match.teams.map((t) => (t.name || '').toLowerCase());
      const hasTbd = names.some((n) => n === 'tbc' || n === 'tbd');
      if (hasTbd) return false;

      const isFaceit = match.source === 'amateur';
      const isBye = names.some((n) => n === 'bye');
      const s = (match.status || '').toLowerCase();
      const isFinished = ['finished', 'completed', 'cancelled', 'aborted'].includes(s);
      if (isFaceit && isFinished && isBye) return false;

      return true;
    });

    return filtered;
  } catch (error) {
    console.error('❌ getMatchesAroundDate error:', error);
    return [];
  }
}
