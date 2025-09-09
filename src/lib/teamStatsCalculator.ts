import { supabase } from '@/integrations/supabase/client';

export async function getMatchSpecificHeadToHeadRecord(
  team1Id: string | number,
  team2Id: string | number,
  _esportType: string,          // kept for signature parity; not needed now
  matchId: string,
  monthsLookback = 6            // optional; default mirrors SQL
): Promise<{ team1Wins: number; team2Wins: number; totalMatches: number }> {
  const { data, error } = await supabase.rpc('get_head_to_head_optimized', {
    p_team1: String(team1Id),
    p_team2: String(team2Id),
    p_match_id: matchId,
    p_months: monthsLookback,
  });

  if (error || !data) {
    console.error('get_head_to_head_optimized error:', error);
    return { team1Wins: 0, team2Wins: 0, totalMatches: 0 };
  }

  return {
    team1Wins: Number(data.team1Wins ?? 0),
    team2Wins: Number(data.team2Wins ?? 0),
    totalMatches: Number(data.totalMatches ?? 0),
  };
}
