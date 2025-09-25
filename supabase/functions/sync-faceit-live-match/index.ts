import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

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
    const { matchId } = await req.json();
    
    if (!matchId) {
      throw new Error('Match ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const faceitApiKey = Deno.env.get('FACEIT_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`🎮 Syncing live FACEIT match data for: ${matchId}`);

    // Get current match data from database
    const { data: matchData, error: matchError } = await supabase
      .from('faceit_matches')
      .select('*')
      .eq('match_id', matchId)
      .single();

    if (matchError || !matchData) {
      console.error('❌ Match not found in database:', matchError);
      throw new Error('Match not found');
    }

    // Fetch live match data from FACEIT API
    const faceitResponse = await fetch(`https://open.faceit.com/data/v4/matches/${matchId}`, {
      headers: {
        'Authorization': `Bearer ${faceitApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!faceitResponse.ok) {
      console.error('❌ FACEIT API error:', faceitResponse.status, faceitResponse.statusText);
      throw new Error(`FACEIT API error: ${faceitResponse.status}`);
    }

    const liveMatchData = await faceitResponse.json();
    console.log('📊 Received live match data from FACEIT API');

    // Extract live data from FACEIT response
    const now = new Date().toISOString();
    const liveTeamScores = {
      faction1: liveMatchData.results?.score?.faction1 || 0,
      faction2: liveMatchData.results?.score?.faction2 || 0
    };

    // Update main match record with live data
    const { error: updateError } = await supabase
      .from('faceit_matches')
      .update({
        status: liveMatchData.status || 'ONGOING',
        match_phase: liveMatchData.status === 'FINISHED' ? 'finished' : 'live',
        live_team_scores: liveTeamScores,
        faceit_data: {
          ...matchData.faceit_data,
          ...liveMatchData,
          results: liveMatchData.results
        },
        raw_data: liveMatchData,
        last_live_update: now,
        updated_at: now,
        ...(liveMatchData.status === 'FINISHED' && {
          finished_at: liveMatchData.finished_at ? 
            new Date(liveMatchData.finished_at * 1000).toISOString() : 
            now
        })
      })
      .eq('match_id', matchId);

    if (updateError) {
      console.error('❌ Error updating match data:', updateError);
      throw updateError;
    }

    // If match has detailed stats, process player performance
    if (liveMatchData.detailed_results && Array.isArray(liveMatchData.detailed_results)) {
      console.log('📈 Processing detailed player statistics...');
      
      for (const gameResult of liveMatchData.detailed_results) {
        if (gameResult.stats && gameResult.stats.roster) {
          for (const [factionKey, factionData] of Object.entries(gameResult.stats.roster)) {
            if (Array.isArray(factionData)) {
              for (const playerStats of factionData) {
                // Upsert player performance data
                const { error: perfError } = await supabase
                  .from('faceit_player_match_performance')
                  .upsert({
                    match_id: matchId,
                    player_id: playerStats.player_id,
                    player_nickname: playerStats.nickname,
                    team_faction: factionKey,
                    kills: parseInt(playerStats.stats?.Kills || '0'),
                    deaths: parseInt(playerStats.stats?.Deaths || '0'),
                    assists: parseInt(playerStats.stats?.Assists || '0'),
                    kd_ratio: parseFloat(playerStats.stats?.['K/D Ratio'] || '0'),
                    adr: parseFloat(playerStats.stats?.ADR || '0'),
                    headshots: parseInt(playerStats.stats?.Headshots || '0'),
                    headshots_percent: parseFloat(playerStats.stats?.['Headshots %'] || '0'),
                    mvp_rounds: parseInt(playerStats.stats?.MVPs || '0'),
                    rating: parseFloat(playerStats.stats?.Rating || '0'),
                    updated_at: now
                  }, {
                    onConflict: 'match_id,player_id'
                  });

                if (perfError) {
                  console.error('❌ Error upserting player performance:', perfError);
                }
              }
            }
          }
        }
      }
    }

    // Update live match stats table
    const { error: liveStatsError } = await supabase
      .from('faceit_live_match_stats')
      .upsert({
        match_id: matchId,
        round_number: 0, // FACEIT API doesn't provide real-time round info
        round_phase: 'live',
        round_timer_seconds: 0,
        team_scores: liveTeamScores,
        player_positions: {},
        player_health: {},
        player_armor: {},
        player_weapons: {},
        player_money: {},
        bomb_status: 'none',
        updated_at: now
      }, {
        onConflict: 'match_id'
      });

    if (liveStatsError) {
      console.error('❌ Error updating live stats:', liveStatsError);
    }

    console.log('✅ Successfully synced live FACEIT match data');

    return new Response(JSON.stringify({
      success: true,
      message: 'Live match data synced successfully',
      matchId,
      status: liveMatchData.status,
      teamScores: liveTeamScores,
      hasDetailedStats: !!(liveMatchData.detailed_results?.length)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in sync-faceit-live-match:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});