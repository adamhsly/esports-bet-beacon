import { supabase } from '@/integrations/supabase/client';

export interface TeamStatsData {
  winRate: number;
  recentForm: string;
  tournamentWins: number;
  totalMatches: number;
}

type DbTeamStats = {
  win_rate?: number;
  recent_form?: string;
  tournament_wins?: number;
  total_matches?: number;
};

export async function getTeamStats(teamId: string): Promise<TeamStatsData | null> {
  if (!teamId) return null;

  // Use `any` to bypass stale generated types that don't yet include the new function/arg
  const { data, error } = await (supabase.rpc as any)('get_team_stats_optimized', {
    p_team_id: teamId, // <-- matches SQL function arg name
  });

  if (error) {
    console.error('getTeamStats RPC error:', error);
    return null;
  }
  if (!data) return null;

  // Handle TABLE return type (array) from RPC
  const row = (Array.isArray(data) ? data[0] : data) as DbTeamStats | undefined;
  if (!row) return null;

  return {
    winRate: Number(row.win_rate ?? 0),
    recentForm: String(row.recent_form ?? ''),
    tournamentWins: Number(row.tournament_wins ?? 0),
    totalMatches: Number(row.total_matches ?? 0),
  };
}
