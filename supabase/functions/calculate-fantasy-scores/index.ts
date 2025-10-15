import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TeamScore {
  team_id: string;
  team_name: string;
  team_type: 'pro' | 'amateur';
  match_wins: number;
  map_wins: number;
  tournaments_won: number;
  clean_sweeps: number;
  matches_played: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🎯 Starting fantasy score calculation...');

    // Optional scoping via request body
    let roundFilter: string | undefined;
    let userFilter: string | undefined;
    try {
      const body = await req.json().catch(() => null);
      if (body && typeof body === 'object') {
        roundFilter = body.round_id ?? body.roundId ?? undefined;
        userFilter = body.user_id ?? body.userId ?? undefined;
        console.log(`🔍 Filters applied - Round: ${roundFilter || 'ALL'}, User: ${userFilter || 'ALL'}`);
      }
    } catch (_) {
      // Ignore bad JSON
    }

    // Get active fantasy rounds (optionally scoped)
    let roundsQuery = supabase
      .from('fantasy_rounds')
      .select('*')
      .in('status', ['open', 'active']);
    if (roundFilter) roundsQuery = roundsQuery.eq('id', roundFilter);

    const { data: activeRounds, error: roundsError } = await roundsQuery;

    if (roundsError) throw roundsError;

    console.log(`📊 Found ${activeRounds?.length || 0} active rounds${roundFilter ? ` (filtered by ${roundFilter})` : ''}`);

    for (const round of activeRounds || []) {
      console.log(`🔄 Processing round ${round.id} (${round.type})`);

      // Get picks for this round (optionally filtered by user)
      let picksQuery = supabase
        .from('fantasy_round_picks')
        .select('*')
        .eq('round_id', round.id);
      if (userFilter) picksQuery = picksQuery.eq('user_id', userFilter);
      const { data: picks, error: picksError } = await picksQuery;

      if (picksError) throw picksError;

      console.log(`👥 Found ${picks?.length || 0} picks for round ${round.id}${userFilter ? ` (filtered by ${userFilter})` : ''}`);

      for (const pick of picks || []) {
        const teamPicks = Array.isArray(pick.team_picks) ? pick.team_picks : [];
        console.log(`🎮 Processing picks for user ${pick.user_id} with ${teamPicks.length} teams`);

        // Prepare team data for batch calculation
        const teamData = teamPicks
          .map(rawTeam => ({
            team_id: String(rawTeam?.id ?? rawTeam?.team_id ?? '').trim(),
            team_name: String(rawTeam?.name ?? rawTeam?.team_name ?? '').trim(),
            team_type: String(rawTeam?.type ?? rawTeam?.team_type ?? 'pro').toLowerCase() === 'amateur' ? 'amateur' : 'pro'
          }))
          .filter(team => team.team_id && team.team_name);

        if (teamData.length === 0) {
          console.warn('⏭️ No valid teams for user', pick.user_id);
          continue;
        }

        // Call optimized RPC function with all teams at once
        const { data: teamScores, error: scoresError } = await supabase
          .rpc('calculate_fantasy_scores_batch', {
            team_data: teamData,
            start_date: round.start_date,
            end_date: round.end_date
          });

        if (scoresError) {
          console.error(`❌ Error calculating scores for user ${pick.user_id}:`, scoresError);
          continue;
        }

        console.log(`✅ Calculated scores for ${teamScores?.length || 0} teams`);

        // Upsert all scores for this user's picks
        const scoresToUpsert = (teamScores || []).map((score: any) => {
          const teamType = teamData.find(t => t.team_id === score.team_id)?.team_type || 'pro';
          const totalScore = calculateTotalScore({
            team_id: score.team_id,
            team_name: score.team_name,
            team_type: teamType as 'pro' | 'amateur',
            match_wins: score.match_wins,
            map_wins: score.map_wins,
            tournaments_won: 0,
            clean_sweeps: score.clean_sweeps,
            matches_played: score.matches_played
          });

          return {
            round_id: round.id,
            user_id: pick.user_id,
            team_id: score.team_id,
            team_name: score.team_name,
            team_type: teamType,
            current_score: totalScore,
            match_wins: score.match_wins,
            map_wins: score.map_wins,
            tournaments_won: 0,
            clean_sweeps: score.clean_sweeps,
            matches_played: score.matches_played,
            last_updated: new Date().toISOString()
          };
        });

        if (scoresToUpsert.length > 0) {
          const { error: upsertError } = await supabase
            .from('fantasy_round_scores')
            .upsert(scoresToUpsert, {
              onConflict: 'round_id,user_id,team_id'
            });

          if (upsertError) {
            console.error(`❌ Error upserting scores for user ${pick.user_id}:`, upsertError);
          } else {
            console.log(`✅ Updated ${scoresToUpsert.length} team scores for user ${pick.user_id}`);
          }
        }

        // Update total score for the pick
        const { data: userScores, error: totalScoreError } = await supabase
          .from('fantasy_round_scores')
          .select('current_score')
          .eq('round_id', round.id)
          .eq('user_id', pick.user_id);

        if (!totalScoreError && userScores) {
          const totalScore = userScores.reduce((sum, score) => sum + (score.current_score || 0), 0);
          
          await supabase
            .from('fantasy_round_picks')
            .update({ total_score: totalScore })
            .eq('id', pick.id);

          console.log(`📈 Updated total score for user ${pick.user_id}: ${totalScore} points`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Fantasy scores calculated successfully',
        rounds_processed: activeRounds?.length || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error calculating fantasy scores:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to calculate fantasy scores', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Removed calculateTeamScore - now handled by database RPC function

function calculateTotalScore(teamScore: TeamScore): number {
  // Scoring system: 
  // - Match win: 10 points
  // - Map win: 3 points  
  // - Clean sweep bonus: 5 points
  // - Tournament win: 25 points
  // - Amateur team bonus: +25% to total score

  let score = 0;
  score += teamScore.match_wins * 10;
  score += teamScore.map_wins * 3;
  score += teamScore.clean_sweeps * 5;
  score += teamScore.tournaments_won * 25;

  // Apply amateur bonus
  if (teamScore.team_type === 'amateur') {
    score = Math.floor(score * 1.25);
  }

  return score;
}