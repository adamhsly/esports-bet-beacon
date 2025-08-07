import { supabase } from '@/integrations/supabase/client';

export async function getTeamStats(teamId: string) {
  const { data, error } = await supabase.rpc('get_team_stats', { team_id: teamId });

  if (error) {
    console.error(`Failed to fetch stats for team ${teamId}:`, error);
    return null;
  }

  return {
    winRate: data.win_rate,
    recentForm: data.recent_form,
    tournamentWins: data.tournament_wins,
    totalMatches: data.total_matches,
  };
}
