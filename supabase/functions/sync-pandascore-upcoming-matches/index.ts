
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Game-specific player fetching functions
interface PlayerData {
  nickname: string;
  player_id: string;
  position?: string;
  role?: string;
}

// Game-specific fetcher functions
const fetchPlayersForGame = async (game: string, apiKey: string, teamId: string, matchId: string): Promise<PlayerData[]> => {
  console.log(`🎮 Fetching ${game} players for team ${teamId} (match ${matchId})...`);
  
  // Strategy 1: Try team roster endpoint
  try {
    const teamResponse = await fetch(`https://api.pandascore.co/${game}/teams/${teamId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (teamResponse.ok) {
      const teamData = await teamResponse.json();
      const players = teamData.players || [];
      
      if (players.length > 0) {
        console.log(`👥 ${game} team ${teamId}: ${players.length} players from roster`);
        return players.map(player => ({
          nickname: player.name,
          player_id: player.id?.toString(),
          position: mapPlayerRole(game, player.role || 'Player')
        }));
      }
    }
  } catch (error) {
    console.log(`⚠️ ${game} team ${teamId} roster fetch failed:`, error);
  }

  // Strategy 2: Try match-specific player stats (for games that support it)
  if (['lol', 'valorant'].includes(game)) {
    try {
      console.log(`🎯 Trying match player stats for ${game} match ${matchId}...`);
      const statsResponse = await fetch(`https://api.pandascore.co/${game}/matches/${matchId}/players/stats`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (statsResponse.ok) {
        const playerStats = await statsResponse.json();
        const teamPlayers = playerStats.filter(stat => 
          stat.team?.id?.toString() === teamId || stat.team?.name === teamId
        );
        
        if (teamPlayers.length > 0) {
          console.log(`👥 ${game} match ${matchId}: ${teamPlayers.length} players from stats`);
          return teamPlayers.map(stat => ({
            nickname: stat.player?.name || stat.name,
            player_id: stat.player?.id?.toString() || stat.id?.toString(),
            position: mapPlayerRole(game, stat.player?.role || stat.role || 'Player')
          }));
        }
      }
    } catch (error) {
      console.log(`⚠️ ${game} match ${matchId} player stats fetch failed:`, error);
    }
  }

  // Strategy 3: Extract from detailed match data
  try {
    console.log(`🔍 Extracting players from ${game} match ${matchId} data...`);
    const matchResponse = await fetch(`https://api.pandascore.co/${game}/matches/${matchId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (matchResponse.ok) {
      const matchData = await matchResponse.json();
      
      // Look for the specific team in opponents
      if (matchData.opponents) {
        for (const opponent of matchData.opponents) {
          if (opponent.opponent?.id?.toString() === teamId && opponent.opponent?.players) {
            const players = opponent.opponent.players.map(player => ({
              nickname: player.name,
              player_id: player.id?.toString(),
              position: mapPlayerRole(game, player.role || 'Player')
            }));
            
            console.log(`👥 ${game} match ${matchId}: ${players.length} players from match data`);
            return players;
          }
        }
      }
    }
  } catch (error) {
    console.log(`⚠️ ${game} match ${matchId} detailed data fetch failed:`, error);
  }

  console.log(`⚠️ No players found for ${game} team ${teamId}`);
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
    sync_type: 'upcoming_matches',
    status: 'running',
    metadata: { games: SUPPORTED_GAMES }
  });

  let totalProcessed = 0;
  let totalAdded = 0;
  let totalUpdated = 0;

  try {
    console.log('🔄 Starting PandaScore upcoming matches sync with game-specific player data...');
    
    const apiKey = Deno.env.get('PANDA_SCORE_API_KEY');
    if (!apiKey) {
      throw new Error('PANDA_SCORE_API_KEY not configured');
    }

    for (const game of SUPPORTED_GAMES) {
      try {
        console.log(`📥 Syncing ${game} upcoming matches...`);
        
        // Fetch upcoming matches from PandaScore API
        const response = await fetch(
          `https://api.pandascore.co/${game}/matches/upcoming?per_page=50`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json'
            }
          }
        );

        if (!response.ok) {
          console.error(`PandaScore API error for ${game}:`, response.status, response.statusText);
          continue;
        }

        const matches = await response.json();
        console.log(`📊 Retrieved ${matches.length} ${game} matches from PandaScore`);

        for (const match of matches) {
          try {
            // Get team data
            const team1Data = match.opponents?.[0]?.opponent;
            const team2Data = match.opponents?.[1]?.opponent;
            
            // Fetch player data using game-specific strategies with rate limiting
            let team1Players = [];
            let team2Players = [];

            if (team1Data?.id) {
              team1Players = await fetchPlayersForGame(game, apiKey, team1Data.id.toString(), match.id.toString());
              // Rate limiting delay
              await new Promise(resolve => setTimeout(resolve, 300));
            }

            if (team2Data?.id) {
              team2Players = await fetchPlayersForGame(game, apiKey, team2Data.id.toString(), match.id.toString());
              // Rate limiting delay
              await new Promise(resolve => setTimeout(resolve, 300));
            }

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
              status: match.status || 'scheduled',
              match_type: match.match_type,
              number_of_games: match.number_of_games,
              raw_data: match,
              last_synced_at: new Date().toISOString()
            };

            console.log(`👥 ${game} match ${match.id} - Team1: ${team1Players.length} players, Team2: ${team2Players.length} players`);

            // Upsert match data
            const { error: upsertError } = await supabase
              .from('pandascore_matches')
              .upsert(transformedMatch, {
                onConflict: 'match_id',
                ignoreDuplicates: false
              });

            if (upsertError) {
              console.error(`Error upserting match ${match.id}:`, upsertError);
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
            console.error(`Error processing match ${match.id}:`, error);
          }
        }

        // Small delay to respect rate limits
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

    console.log(`✅ PandaScore upcoming matches sync completed with game-specific player data: ${totalProcessed} processed, ${totalAdded} added, ${totalUpdated} updated`);

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

    console.error('❌ PandaScore upcoming matches sync failed:', error);
    
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
