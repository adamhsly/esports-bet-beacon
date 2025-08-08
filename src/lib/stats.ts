import { supabase } from '@/integrations/supabase/client';

export async function getTeamStats(teamId: string) {
  try {
    // First try to get pre-calculated stats from pandascore_team_stats table
    const { data: preCalculatedStats, error: preCalculatedError } = await supabase
      .from('pandascore_team_stats')
      .select('*')
      .eq('team_id', teamId)
      .maybeSingle();

    if (preCalculatedStats && !preCalculatedError) {
      return {
        winRate: preCalculatedStats.win_rate,
        recentForm: preCalculatedStats.recent_form || 'N/A',
        tournamentWins: preCalculatedStats.tournament_wins,
        totalMatches: preCalculatedStats.total_matches,
      };
    }

    // Fallback: Try the RPC function with timeout handling
    const { data, error } = await Promise.race([
      (supabase as any).rpc('get_team_stats', { team_id: teamId }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Function timeout')), 10000)
      )
    ]) as any;

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
  } catch (error) {
    console.error(`Error fetching team stats for ${teamId}:`, error);
    return null;
  }
}
