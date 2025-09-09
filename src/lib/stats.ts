// lib/stats.ts
import { supabase } from '@/integrations/supabase/client';

/**
 * Shape of team stats data returned to the frontend
 */
export type TeamStatsData = {
  winRate: number;
  recentForm: string;
  tournamentWins: number;
  totalMatches: number;
};

/**
 * Fetch aggregated team stats from Supabase via the
 * Postgres function `get_team_stats_optimized(p_team_id text)`.
 *
 * @param teamId - The team identifier (as text) to fetch stats for
 * @returns A TeamStatsData object or null if no data
 */
export async function getTeamStats(teamId: string): Promise<TeamStatsData | null> {
  if (!teamId) return null;

  // Call the Supabase RPC function
  const { data, error } = await supabase.rpc('get_team_stats_optimized', {
    p_team_id: teamId, // must match the SQL function argument name
  });

  if (error) {
    console.error('❌ getTeamStats RPC error:', error);
    return null;
  }
  if (!data) {
    console.warn(`⚠️ No stats returned for team_id=${teamId}`);
    return null;
  }

  // Map the JSONB response into a simpler frontend-friendly shape
  return {
    winRate: Number(data.win_rate ?? 0),
    recentForm: String(data.recent_form ?? ''),
    tournamentWins: Number(data.tournament_wins ?? 0),
    totalMatches: Number(data.total_matches ?? 0),
  };
}
