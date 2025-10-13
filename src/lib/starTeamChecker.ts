import { supabase } from '@/integrations/supabase/client';

/**
 * Check if the user's star team finishes in their top 3 picks after round results
 * This should be called when a round finishes and scores are calculated
 */
export async function checkStarTeamPerformance(
  userId: string,
  roundId: string,
  starTeamId: string
): Promise<void> {
  try {
    // Get user's picks and their scores for this round
    const { data: picks, error: picksError } = await supabase
      .from('fantasy_round_picks')
      .select('team_picks')
      .eq('user_id', userId)
      .eq('round_id', roundId)
      .single();

    if (picksError || !picks?.team_picks) {
      return;
    }

    // Get all team scores for this round
    const { data: scores, error: scoresError } = await supabase
      .from('fantasy_round_scores')
      .select('team_id, current_score')
      .eq('user_id', userId)
      .eq('round_id', roundId);

    if (scoresError || !scores) {
      return;
    }

    // Create a map of team_id -> score
    const scoreMap = new Map<string, number>();
    scores.forEach(s => scoreMap.set(s.team_id, s.current_score));

    // Get scores for user's picked teams
    const teamPicks = Array.isArray(picks.team_picks) ? picks.team_picks : [];
    const pickedTeamScores = teamPicks
      .map((pick: any) => ({
        teamId: pick.id || pick.team_id,
        score: scoreMap.get(pick.id || pick.team_id) || 0
      }))
      .sort((a, b) => b.score - a.score); // Sort by score descending

    // Check if star team is in top 3
    const starTeamIndex = pickedTeamScores.findIndex(t => t.teamId === starTeamId);
    
    if (starTeamIndex !== -1 && starTeamIndex < 3) {
      // Star team is in top 3!
      const { MissionBus } = await import('@/lib/missionBus');
      MissionBus.onStarTopAfterResults();
    }
  } catch (error) {
    console.warn('[StarTeamChecker] Failed to check star team performance:', error);
  }
}

/**
 * Batch check star team performance for all users in a finished round
 * This can be called by an edge function when a round finishes
 */
export async function batchCheckStarTeamPerformance(roundId: string): Promise<void> {
  try {
    // Get all users with star teams for this round
    const { data: starTeams, error: starError } = await supabase
      .from('fantasy_round_star_teams')
      .select('user_id, star_team_id')
      .eq('round_id', roundId);

    if (starError || !starTeams) {
      return;
    }

    // Check each user's star team performance
    const checks = starTeams.map(st =>
      checkStarTeamPerformance(st.user_id, roundId, st.star_team_id)
    );

    await Promise.allSettled(checks);
  } catch (error) {
    console.warn('[StarTeamChecker] Batch check failed:', error);
  }
}
