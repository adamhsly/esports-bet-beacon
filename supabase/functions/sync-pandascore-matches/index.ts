
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fixed: Changed 'cs2' to 'csgo' for proper Counter-Strike syncing
const SUPPORTED_GAMES = ['csgo', 'lol', 'dota2', 'valorant', 'ow'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const logId = crypto.randomUUID();
  const startTime = Date.now();

  // Log sync start
  await supabase.from('pandascore_sync_logs').insert({
    id: logId,
    sync_type: 'matches',
    status: 'running',
    metadata: { games: SUPPORTED_GAMES, endpoints: ['upcoming', 'past'] }
  });

  let totalProcessed = 0;
  let totalAdded = 0;
  let totalUpdated = 0;

  try {
    console.log('🔄 Starting PandaScore matches sync (upcoming + past) with game-specific player data...');
    
    const apiKey = Deno.env.get('PANDA_SCORE_API_KEY');
    if (!apiKey) {
      throw new Error('PANDA_SCORE_API_KEY not configured');
    }

    // Game-specific player data fetching strategy
    const fetchPlayerDataForGame = async (game: string, matchId: number, teamData: any, detailedMatch: any) => {
      console.log(`🎮 Fetching player data for ${game} match ${matchId}...`);
      
      switch (game) {
        case 'valorant':
        case 'lol':
          // These games have robust match-level player stats endpoints
          return await fetchMatchPlayerStats(game, matchId, teamData, apiKey);
          
        case 'csgo':
          // Try team roster first, fallback to match data
          return await fetchTeamRosterWithFallback(game, teamData, detailedMatch, apiKey);
          
        case 'dota2':
          // Use team rosters with better error handling
          return await fetchTeamRosterSafe(game, teamData, apiKey);
          
        case 'ow':
          // Overwatch has limited roster data, extract from match if possible
          return await extractPlayersFromMatchData(detailedMatch, teamData);
          
        default:
          console.log(`⚠️ No player data strategy for game: ${game}`);
          return [];
      }
    };

    // Fetch match-level player stats (for Valorant/LoL)
    const fetchMatchPlayerStats = async (game: string, matchId: number, teamData: any, apiKey: string) => {
      try {
        console.log(`📊 Fetching match player stats for ${game} match ${matchId}...`);
        const response = await fetch(
          `https://api.pandascore.co/${game}/matches/${matchId}/players/stats`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json'
            }
          }
        );

        if (!response.ok) {
          console.log(`⚠️ Could not fetch match player stats for ${game}: ${response.status}`);
          return [];
        }

        const playerStats = await response.json();
        console.log(`👥 Retrieved ${playerStats.length} player stats for match ${matchId}`);
        
        return playerStats.map(player => ({
          nickname: player.player?.name || player.name,
          player_id: player.player?.id?.toString() || player.id?.toString(),
          position: player.player?.role || player.role || 'Player'
        }));
      } catch (error) {
        console.error(`Error fetching match player stats for ${game}:`, error);
        return [];
      }
    };

    // Fetch team roster with fallback to match data
    const fetchTeamRosterWithFallback = async (game: string, teamData: any, detailedMatch: any, apiKey: string) => {
      if (!teamData?.id) return [];
      
      try {
        console.log(`🏟️ Fetching team roster for team ${teamData.id} in ${game}...`);
        const teamResponse = await fetch(
          `https://api.pandascore.co/${game}/teams/${teamData.id}`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json'
            }
          }
        );

        if (teamResponse.ok) {
          const teamDetails = await teamResponse.json();
          const players = teamDetails.players || [];
          console.log(`👥 Retrieved ${players.length} players from team roster`);
          
          return players.map(player => ({
            nickname: player.name,
            player_id: player.id?.toString(),
            position: player.role || 'Player'
          }));
        } else {
          console.log(`⚠️ Team roster failed, trying match data fallback...`);
          return await extractPlayersFromMatchData(detailedMatch, teamData);
        }
      } catch (error) {
        console.error(`Error fetching team roster, using fallback:`, error);
        return await extractPlayersFromMatchData(detailedMatch, teamData);
      }
    };

    // Safely fetch team roster (for Dota2)
    const fetchTeamRosterSafe = async (game: string, teamData: any, apiKey: string) => {
      if (!teamData?.id) return [];
      
      try {
        console.log(`🏟️ Safely fetching team roster for team ${teamData.id} in ${game}...`);
        const teamResponse = await fetch(
          `https://api.pandascore.co/${game}/teams/${teamData.id}`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json'
            }
          }
        );

        if (teamResponse.ok) {
          const teamDetails = await teamResponse.json();
          const players = teamDetails.players || [];
          console.log(`👥 Retrieved ${players.length} players for team ${teamData.id}`);
          
          return players.map(player => ({
            nickname: player.name,
            player_id: player.id?.toString(),
            position: player.role || 'Player'
          }));
        } else {
          console.log(`⚠️ Could not fetch team ${teamData.id} roster: ${teamResponse.status}`);
          return [];
        }
      } catch (error) {
        console.error(`Error fetching team ${teamData.id} roster:`, error);
        return [];
      }
    };

    // Extract players from match raw data as fallback
    const extractPlayersFromMatchData = async (detailedMatch: any, teamData: any) => {
      try {
        console.log(`🔍 Extracting players from match data for team ${teamData?.name}...`);
        
        // Try to find players in various parts of the match data
        const rawPlayers = detailedMatch.players || [];
        const teamPlayers = rawPlayers.filter(player => 
          player.team?.id === teamData?.id || player.team?.name === teamData?.name
        );
        
        if (teamPlayers.length > 0) {
          console.log(`👥 Found ${teamPlayers.length} players in match data`);
          return teamPlayers.map(player => ({
            nickname: player.name,
            player_id: player.id?.toString(),
            position: player.role || 'Player'
          }));
        }
        
        console.log(`⚠️ No players found in match data for team ${teamData?.name}`);
        return [];
      } catch (error) {
        console.error(`Error extracting players from match data:`, error);
        return [];
      }
    };

    for (const game of SUPPORTED_GAMES) {
      try {
        console.log(`📥 Syncing ${game} matches (upcoming + past)...`);
        
        // Fetch both upcoming and past matches with better endpoint handling
        const endpoints = [
          { type: 'upcoming', url: `https://api.pandascore.co/${game}/matches/upcoming?per_page=50` },
          { type: 'past', url: `https://api.pandascore.co/${game}/matches/past?per_page=30&filter[status]=finished` }
        ];

        for (const endpoint of endpoints) {
          console.log(`📡 Fetching ${endpoint.type} ${game} matches...`);
          
          try {
            const response = await fetch(endpoint.url, {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
              }
            });

            if (!response.ok) {
              if (response.status === 404) {
                console.log(`⚠️ Endpoint not available for ${game} ${endpoint.type} matches (404) - skipping`);
                continue;
              }
              console.error(`PandaScore API error for ${game} ${endpoint.type}:`, response.status, response.statusText);
              continue;
            }

            const matches = await response.json();
            console.log(`📊 Retrieved ${matches.length} ${endpoint.type} ${game} matches from PandaScore`);

            for (const match of matches) {
              try {
                // Fetch detailed match data
                console.log(`🔍 Fetching detailed data for ${endpoint.type} match ${match.id}...`);
                const detailResponse = await fetch(
                  `https://api.pandascore.co/${game}/matches/${match.id}`,
                  {
                    headers: {
                      'Authorization': `Bearer ${apiKey}`,
                      'Accept': 'application/json'
                    }
                  }
                );

                let detailedMatch = match;
                if (detailResponse.ok) {
                  detailedMatch = await detailResponse.json();
                  console.log(`✅ Got detailed data for ${endpoint.type} match ${match.id}`);
                } else {
                  console.log(`⚠️ Could not fetch detailed data for ${endpoint.type} match ${match.id}, using basic data`);
                }

                // Get team data
                const team1Data = detailedMatch.opponents?.[0]?.opponent;
                const team2Data = detailedMatch.opponents?.[1]?.opponent;
                
                // Fetch player data using game-specific strategies
                let team1Players = [];
                let team2Players = [];

                if (team1Data?.id) {
                  team1Players = await fetchPlayerDataForGame(game, match.id, team1Data, detailedMatch);
                  // Small delay to respect rate limits
                  await new Promise(resolve => setTimeout(resolve, 200));
                }

                if (team2Data?.id) {
                  team2Players = await fetchPlayerDataForGame(game, match.id, team2Data, detailedMatch);
                  // Small delay to respect rate limits
                  await new Promise(resolve => setTimeout(resolve, 200));
                }

                // Map PandaScore status to our internal status
                const mapStatus = (pandaStatus: string) => {
                  const statusMap: Record<string, string> = {
                    'finished': 'finished',
                    'canceled': 'cancelled',
                    'canceled_by_opponent': 'cancelled',
                    'forfeit': 'finished',
                    'not_started': 'scheduled',
                    'postponed': 'scheduled',
                    'running': 'live',
                    'paused': 'live'
                  };
                  return statusMap[pandaStatus] || pandaStatus;
                };

                const transformedMatch = {
                  match_id: detailedMatch.id.toString(),
                  esport_type: game,
                  teams: {
                    team1: {
                      id: team1Data?.id,
                      name: team1Data?.name || 'TBD',
                      logo: team1Data?.image_url,
                      acronym: team1Data?.acronym,
                      players: team1Players
                    },
                    team2: {
                      id: team2Data?.id,
                      name: team2Data?.name || 'TBD',
                      logo: team2Data?.image_url,
                      acronym: team2Data?.acronym,
                      players: team2Players
                    }
                  },
                  start_time: detailedMatch.begin_at || detailedMatch.scheduled_at,
                  end_time: detailedMatch.end_at,
                  tournament_id: detailedMatch.tournament?.id?.toString(),
                  tournament_name: detailedMatch.tournament?.name,
                  league_id: detailedMatch.league?.id?.toString(),
                  league_name: detailedMatch.league?.name,
                  serie_id: detailedMatch.serie?.id?.toString(),
                  serie_name: detailedMatch.serie?.name,
                  status: mapStatus(detailedMatch.status || 'scheduled'),
                  match_type: detailedMatch.match_type,
                  number_of_games: detailedMatch.number_of_games,
                  raw_data: detailedMatch,
                  last_synced_at: new Date().toISOString()
                };

                console.log(`👥 ${endpoint.type} match ${detailedMatch.id} (${transformedMatch.status}) - Team1: ${team1Players.length} players, Team2: ${team2Players.length} players`);

                // Upsert match data
                const { error: upsertError } = await supabase
                  .from('pandascore_matches')
                  .upsert(transformedMatch, {
                    onConflict: 'match_id',
                    ignoreDuplicates: false
                  });

                if (upsertError) {
                  console.error(`Error upserting ${endpoint.type} match ${detailedMatch.id}:`, upsertError);
                  continue;
                }

                totalProcessed++;
                
                // Check if this was an insert or update
                const { data: existing } = await supabase
                  .from('pandascore_matches')
                  .select('created_at, updated_at')
                  .eq('match_id', detailedMatch.id.toString())
                  .single();

                if (existing && existing.created_at === existing.updated_at) {
                  totalAdded++;
                } else {
                  totalUpdated++;
                }

              } catch (error) {
                console.error(`Error processing ${endpoint.type} match ${match.id}:`, error);
              }
            }
          } catch (endpointError) {
            console.error(`Error fetching ${endpoint.type} matches for ${game}:`, endpointError);
          }

          // Small delay between endpoint requests to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Small delay between games to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error syncing ${game} matches:`, error);
      }
    }

    const duration = Date.now() - startTime;
    
    // Update sync log with success
    await supabase.from('pandascore_sync_logs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      records_processed: totalProcessed,
      records_added: totalAdded,
      records_updated: totalUpdated
    }).eq('id', logId);

    console.log(`✅ PandaScore matches sync completed with game-specific player data: ${totalProcessed} processed, ${totalAdded} added, ${totalUpdated} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        added: totalAdded,
        updated: totalUpdated,
        duration_ms: duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Update sync log with error
    await supabase.from('pandascore_sync_logs').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      error_message: error.message,
      error_details: { error: error.toString() },
      records_processed: totalProcessed,
      records_added: totalAdded,
      records_updated: totalUpdated
    }).eq('id', logId);

    console.error('❌ PandaScore matches sync failed:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        processed: totalProcessed
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
