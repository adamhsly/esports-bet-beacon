import { supabase } from '@/integrations/supabase/client';

export async function getTeamStats(teamId: string) {
  // Use type assertion since get_team_stats exists but isn't in generated types
  const { data, error } = await (supabase as any).rpc('get_team_stats', { team_id: teamId });

  if (error) {
    console.error(`Failed to fetch stats for team ${teamId}:`, error);
    return null;
  }

  // The PostgreSQL function returns a JSON object, so access it directly
  return {
    winRate: data.win_rate,
    recentForm: data.recent_form,
    tournamentWins: data.tournament_wins,
    totalMatches: data.total_matches,
  };
}
