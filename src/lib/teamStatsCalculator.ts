// src/lib/teamStatsCalculator.ts
import { supabase } from '@/integrations/supabase/client';

/** Shape returned to the UI for head-to-head */
export type HeadToHead = {
  team1Wins: number;
  team2Wins: number;
  totalMatches: number;
};

/** JSON shape we expect back from the SQL RPC */
type H2HJson = {
  team1Wins?: number;
  team2Wins?: number;
  totalMatches?: number;
  since?: string;
  until?: string;
};

/**
 * Match-specific head-to-head, optimized on DB:
 * Calls SQL function: public.get_head_to_head_optimized(p_team1, p_team2, p_match_id, p_months)
 *
 * - Filters to FINISHED matches
 * - Considers only matches in the last `monthsLookback` months BEFORE the given match's start_time
 * - Uses participants table under the hood (fast + set-based)
 *
 * Note: `_esportType` kept for signature compatibility with existing callers; not needed by the RPC.
 */
export async function getMatchSpecificHeadToHeadRecord(
  team1Id: string | number,
  team2Id: string | number,
  _esportType: string,
  matchId: string,
  monthsLookback = 6
): Promise<HeadToHead> {
  const { data, error } = await (supabase.rpc as any)('get_head_to_head_optimized', {
    p_team1: String(team1Id),
    p_team2: String(team2Id),
    p_match_id: matchId,
    p_months: monthsLookback,
  });

  if (error || !data) {
    console.error('get_head_to_head_optimized error:', error);
    return { team1Wins: 0, team2Wins: 0, totalMatches: 0 };
  }

  const h2h = data as H2HJson;

  return {
    team1Wins: Number(h2h.team1Wins ?? 0),
    team2Wins: Number(h2h.team2Wins ?? 0),
    totalMatches: Number(h2h.totalMatches ?? 0),
  };
}

/**
 * All-time head-to-head helper (kept for convenience).
 * Uses the precomputed table `panda_team_head_to_head`.
 *
 * If you later add a DB function for all-time H2H, swap this to an RPC too.
 */
export async function getHeadToHeadRecord(
  team1Id: string | number,
  team2Id: string | number,
  esportType?: string  // include if your table has this column; otherwise omit filter below
): Promise<HeadToHead> {
  const team1IdStr = String(team1Id);
  const team2IdStr = String(team2Id);

  let query = supabase
    .from('panda_team_head_to_head')
    .select('*')
    .or(
      `and(team_a_id.eq.${team1IdStr},team_b_id.eq.${team2IdStr}),` +
      `and(team_a_id.eq.${team2IdStr},team_b_id.eq.${team1IdStr})`
    )
    .order('last_match_at', { ascending: false })
    .limit(1);

  if (esportType) {
    query = (query as any).eq('esport_type', esportType);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    if (error) console.error('getHeadToHeadRecord error:', error);
    return { team1Wins: 0, team2Wins: 0, totalMatches: 0 };
  }

  // Flip counts if stored order is reversed
  const reversed = data.team_a_id === team2IdStr;
  const team1Wins = Number(reversed ? data.team_b_wins ?? 0 : data.team_a_wins ?? 0);
  const team2Wins = Number(reversed ? data.team_a_wins ?? 0 : data.team_b_wins ?? 0);
  const totalMatches = Number(data.total_matches ?? 0);

  return { team1Wins, team2Wins, totalMatches };
}
