import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('🔍 Testing KUKUYS score calculation...');

    // First, let's check if KUKUYS exists in faceit_matches on Jan 23rd
    const { data: faceitMatches, error: faceitError } = await supabase
      .from('faceit_matches')
      .select('match_id, teams, status, started_at, faceit_data')
      .gte('started_at', '2025-01-23T00:00:00Z')
      .lt('started_at', '2025-01-24T00:00:00Z')
      .in('status', ['finished', 'FINISHED']);

    console.log(`📋 Found ${faceitMatches?.length || 0} FACEIT matches on Jan 23rd`);

    if (faceitMatches) {
      for (const match of faceitMatches) {
        const teams = match.teams || {};
        const faction1Name = teams.faction1?.name || '';
        const faction2Name = teams.faction2?.name || '';
        
        console.log(`🎮 Match ${match.match_id}: ${faction1Name} vs ${faction2Name} (Status: ${match.status})`);
        
        // Check if KUKUYS is in this match
        if (faction1Name.toLowerCase().includes('kukuy') || faction2Name.toLowerCase().includes('kukuy')) {
          console.log(`🎯 FOUND KUKUYS in match ${match.match_id}`);
          console.log(`Teams:`, teams);
          console.log(`FACEIT Data:`, match.faceit_data);
          
          // Check who won
          if (match.faceit_data?.results?.winner) {
            console.log(`🏆 Winner: ${match.faceit_data.results.winner}`);
            
            let kukuysWon = false;
            if (faction1Name.toLowerCase().includes('kukuy') && match.faceit_data.results.winner === 'faction1') {
              kukuysWon = true;
            } else if (faction2Name.toLowerCase().includes('kukuy') && match.faceit_data.results.winner === 'faction2') {
              kukuysWon = true;
            }
            
            console.log(`🎯 KUKUYS won this match: ${kukuysWon}`);
          }
        }
      }
    }

    // Check fantasy rounds for Jan 23rd
    const { data: rounds, error: roundsError } = await supabase
      .from('fantasy_rounds')
      .select('*')
      .lte('start_date', '2025-01-23T23:59:59Z')
      .gte('end_date', '2025-01-23T00:00:00Z');

    console.log(`📅 Found ${rounds?.length || 0} fantasy rounds covering Jan 23rd`);
    
    if (rounds) {
      for (const round of rounds) {
        console.log(`📅 Round: ${round.name} (${round.id}), Type: ${round.round_type}, Status: ${round.status}`);
        
        // Check picks for KUKUYS in this round
        const { data: picks, error: picksError } = await supabase
          .from('fantasy_round_picks')
          .select('user_id, team_id, team_name, team_type')
          .eq('round_id', round.id)
          .ilike('team_name', '%kukuy%');
          
        console.log(`👥 Found ${picks?.length || 0} KUKUYS picks in round ${round.name}`);
        if (picks && picks.length > 0) {
          console.log(`🔍 KUKUYS picks:`, picks);
          
          // Check existing scores
          for (const pick of picks) {
            const { data: scores, error: scoresError } = await supabase
              .from('fantasy_round_scores')
              .select('*')
              .eq('round_id', round.id)
              .eq('user_id', pick.user_id)
              .eq('team_id', pick.team_id);
              
            console.log(`📊 Existing scores for user ${pick.user_id}, team ${pick.team_name}:`, scores);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'KUKUYS analysis complete - check logs',
        faceitMatches: faceitMatches?.length || 0,
        rounds: rounds?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in test-kukuys-score:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});