
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Tournament rosters cache to avoid repeated API calls
const tournamentRostersCache = new Map<string, any>();

// Enhanced player data extraction using tournament rosters
interface PlayerData {
  nickname: string;
  player_id: string;
  position?: string;
  role?: string;
}

// Fetch tournament rosters using the correct endpoint structure
const fetchTournamentRosters = async (tournamentId: string, apiKey: string): Promise<any> => {
  console.log(`🏆 Fetching tournament rosters for tournament ${tournamentId}...`);
  
  // Check cache first
  if (tournamentRostersCache.has(tournamentId)) {
    console.log(`📦 Using cached rosters for tournament ${tournamentId}`);
    return tournamentRostersCache.get(tournamentId);
  }
  
  try {
    const response = await fetch(`https://api.pandascore.co/tournaments/${tournamentId}/rosters`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`⚠️ Tournament ${tournamentId} rosters not found (404) - tournament may not have roster data`);
        return null;
      }
      console.error(`❌ Failed to fetch tournament rosters: ${response.status} - ${response.statusText}`);
      return null;
    }

    const rostersResponse = await response.json();
    
    if (!rostersResponse || typeof rostersResponse !== 'object' || !rostersResponse.rosters) {
      console.log(`⚠️ Unexpected roster response structure for tournament ${tournamentId}:`, rostersResponse);
      return null;
    }

    // Cache the result
    tournamentRostersCache.set(tournamentId, rostersResponse);
    console.log(`✅ Successfully fetched and cached rosters for tournament ${tournamentId}`);
    
    return rostersResponse;
  } catch (error) {
    console.error(`❌ Error fetching tournament rosters for ${tournamentId}:`, error);
    return null;
  }
};

// Extract players for a specific team from tournament rosters
const getPlayersFromTournamentRosters = (rostersResponse: any, teamId: string): PlayerData[] => {
  if (!rostersResponse || !rostersResponse.rosters) {
    return [];
  }

  const rosters = rostersResponse.rosters;
  
  for (const roster of rosters) {
    if (!roster || typeof roster !== 'object') {
      continue;
    }
    
    if (roster.id?.toString() === teamId.toString()) {
      const players = roster.players || [];
      console.log(`🎯 Found ${players.length} players for team ${teamId} in tournament rosters`);
      
      return players.map((player: any) => ({
        nickname: player.name || 'Unknown Player',
        player_id: player.id?.toString() || '',
        position: mapPlayerRole('default', player.role || 'Player'),
        role: player.role || 'Player'
      }));
    }
  }
  
  console.log(`⚠️ Team ${teamId} not found in tournament rosters`);
  return [];
};

// Game-specific role mapping
const mapPlayerRole = (game: string, role: string): string => {
  const gameMappings = {
    'csgo': {
      'awper': 'AWPer',
      'igl': 'IGL',
      'entry': 'Entry Fragger',
      'support': 'Support',
      'lurker': 'Lurker',
      'rifler': 'Rifler'
    },
    'lol': {
      'top': 'Top',
      'jun': 'Jungle',
      'jungle': 'Jungle',
      'mid': 'Mid',
      'adc': 'ADC',
      'bot': 'ADC',
      'sup': 'Support',
      'support': 'Support'
    },
    'valorant': {
      'duelist': 'Duelist',
      'controller': 'Controller',
      'initiator': 'Initiator',
      'sentinel': 'Sentinel',
      'flex': 'Flex'
    },
    'dota2': {
      'carry': 'Carry',
      'mid': 'Mid',
      'offlaner': 'Offlaner',
      'support': 'Support',
      'hard_support': 'Hard Support',
      'core': 'Core'
    },
    'ow': {
      'tank': 'Tank',
      'dps': 'DPS',
      'damage': 'DPS',
      'support': 'Support',
      'flex': 'Flex'
    }
  };
  
  const mapping = gameMappings[game] || {};
  return mapping[role.toLowerCase()] || 'Player';
};

// Enhanced player fetching using tournament rosters as primary method
const fetchPlayersForMatch = async (game: string, apiKey: string, match: any): Promise<{team1Players: PlayerData[], team2Players: PlayerData[]}> => {
  console.log(`🎮 Fetching players for ${game} match ${match.id} using tournament rosters...`);
  
  let team1Players: PlayerData[] = [];
  let team2Players: PlayerData[] = [];
  
  // Extract tournament ID from match
  const tournament = match.tournament;
  if (!tournament || !tournament.id) {
    console.log(`⚠️ Match ${match.id} has no valid tournament data`);
    return { team1Players, team2Players };
  }
  
  const tournamentId = tournament.id.toString();
  console.log(`🏆 Match ${match.id} belongs to tournament ${tournamentId}`);
  
  // Fetch tournament rosters
  const rostersResponse = await fetchTournamentRosters(tournamentId, apiKey);
  if (!rostersResponse) {
    console.log(`⚠️ Could not fetch rosters for tournament ${tournamentId}`);
    return { team1Players, team2Players };
  }
  
  // Extract team IDs from match opponents
  const team1Data = match.opponents?.[0]?.opponent;
  const team2Data = match.opponents?.[1]?.opponent;
  
  if (team1Data?.id) {
    team1Players = getPlayersFromTournamentRosters(rostersResponse, team1Data.id.toString());
    console.log(`👥 Team 1 (${team1Data.name}): ${team1Players.length} players`);
  }
  
  if (team2Data?.id) {
    team2Players = getPlayersFromTournamentRosters(rostersResponse, team2Data.id.toString());
    console.log(`👥 Team 2 (${team2Data.name}): ${team2Players.length} players`);
  }
  
  // Add small delay to respect rate limits
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return { team1Players, team2Players };
};

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
    metadata: { games: SUPPORTED_GAMES, endpoints: ['upcoming', 'past'], usesTournamentRosters: true }
  });

  let totalProcessed = 0;
  let totalAdded = 0;
  let totalUpdated = 0;

  try {
    console.log('🔄 Starting PandaScore matches sync with tournament rosters API...');
    
    const apiKey = Deno.env.get('PANDA_SCORE_API_KEY');
    if (!apiKey) {
      throw new Error('PANDA_SCORE_API_KEY not configured');
    }

    for (const game of SUPPORTED_GAMES) {
      try {
        console.log(`📥 Syncing ${game} matches (upcoming + past) with tournament rosters...`);
        
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
                // Get team data
                const team1Data = match.opponents?.[0]?.opponent;
                const team2Data = match.opponents?.[1]?.opponent;
                
                // Fetch player data using tournament rosters API
                const { team1Players, team2Players } = await fetchPlayersForMatch(game, apiKey, match);

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
                  match_id: match.id.toString(),
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
                  start_time: match.begin_at || match.scheduled_at,
                  end_time: match.end_at,
                  tournament_id: match.tournament?.id?.toString(),
                  tournament_name: match.tournament?.name,
                  league_id: match.league?.id?.toString(),
                  league_name: match.league?.name,
                  serie_id: match.serie?.id?.toString(),
                  serie_name: match.serie?.name,
                  status: mapStatus(match.status || 'scheduled'),
                  match_type: match.match_type,
                  number_of_games: match.number_of_games,
                  raw_data: match,
                  last_synced_at: new Date().toISOString()
                };

                console.log(`👥 ${endpoint.type} ${game} match ${match.id} (${transformedMatch.status}) - Team1: ${team1Players.length} players, Team2: ${team2Players.length} players`);

                // Upsert match data
                const { error: upsertError } = await supabase
                  .from('pandascore_matches')
                  .upsert(transformedMatch, {
                    onConflict: 'match_id',
                    ignoreDuplicates: false
                  });

                if (upsertError) {
                  console.error(`Error upserting ${endpoint.type} match ${match.id}:`, upsertError);
                  continue;
                }

                totalProcessed++;
                
                // Check if this was an insert or update
                const { data: existing } = await supabase
                  .from('pandascore_matches')
                  .select('created_at, updated_at')
                  .eq('match_id', match.id.toString())
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

    console.log(`✅ PandaScore matches sync completed with tournament rosters: ${totalProcessed} processed, ${totalAdded} added, ${totalUpdated} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        added: totalAdded,
        updated: totalUpdated,
        duration_ms: duration,
        usesTournamentRosters: true
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
