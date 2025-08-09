import { supabase } from '@/integrations/supabase/client';

export async function getTeamStats(teamId: string) {
  try {
    // Use Edge Function to retrieve optimized stats (no table fallback)
    const { data, error } = await supabase.functions.invoke('get-team-stats', {
      body: { teamId },
    });

    if (error) {
      console.error(`Failed to fetch optimized stats for team ${teamId}:`, error);
      return null;
    }

    const stats = (data as any)?.stats;
    if (!stats) return null;

    return {
      winRate: stats.win_rate ?? 0,
      recentForm: stats.recent_form ?? 'N/A',
      tournamentWins: stats.tournament_wins ?? 0,
      totalMatches: stats.total_matches ?? 0,
    };
  } catch (error) {
    console.error(`Error fetching optimized team stats for ${teamId}:`, error);
    return null;
  }
}
