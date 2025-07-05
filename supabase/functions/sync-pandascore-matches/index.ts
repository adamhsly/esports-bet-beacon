
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

// Enhanced player profile data from PandaScore API
interface EnhancedPlayerData extends PlayerData {
  name?: string;
  slug?: string;
  image_url?: string;
  nationality?: string;
  team_id?: string;
  team_name?: string;
  career_stats?: any;
  recent_stats?: any;
  kda_ratio?: number;
  avg_kills?: number;
  avg_deaths?: number;
  avg_assists?: number;
}

// Enhanced team statistics data
interface EnhancedTeamData {
  team_id: string;
  esport_type: string;
  map_stats?: any;
  recent_stats?: any;
  tournament_performance?: any;
  roster_info?: any;
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

// Enhanced API fetching functions for detailed statistics

// Fetch enhanced team statistics from PandaScore API
const fetchTeamDetailedStats = async (teamId: string, game: string, apiKey: string): Promise<EnhancedTeamData | null> => {
  console.log(`📊 Fetching detailed stats for team ${teamId} in ${game}...`);
  
  try {
    // Fetch team statistics
    const statsResponse = await fetch(`https://api.pandascore.co/${game}/teams/${teamId}/stats`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    let teamStats = null;
    if (statsResponse.ok) {
      teamStats = await statsResponse.json();
      console.log(`✅ Retrieved team stats for ${teamId}`);
    } else {
      console.log(`⚠️ Team stats not available for ${teamId} (${statsResponse.status})`);
    }

    // Fetch team details and current roster
    const teamResponse = await fetch(`https://api.pandascore.co/${game}/teams/${teamId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    let teamDetails = null;
    if (teamResponse.ok) {
      teamDetails = await teamResponse.json();
      console.log(`✅ Retrieved team details for ${teamId}`);
    }

    // Combine the data
    const enhancedData: EnhancedTeamData = {
      team_id: teamId,
      esport_type: game,
      map_stats: teamStats?.maps || {},
      recent_stats: teamStats?.recent || {},
      tournament_performance: teamStats?.tournaments || {},
      roster_info: {
        current_roster: teamDetails?.players || [],
        team_details: teamDetails
      }
    };

    return enhancedData;
  } catch (error) {
    console.error(`❌ Error fetching enhanced team data for ${teamId}:`, error);
    return null;
  }
};

// Fetch enhanced player data from PandaScore API
const fetchPlayerDetailedData = async (playerId: string, game: string, apiKey: string): Promise<EnhancedPlayerData | null> => {
  console.log(`👤 Fetching detailed data for player ${playerId} in ${game}...`);
  
  try {
    // Fetch player profile
    const playerResponse = await fetch(`https://api.pandascore.co/${game}/players/${playerId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!playerResponse.ok) {
      console.log(`⚠️ Player data not available for ${playerId} (${playerResponse.status})`);
      return null;
    }

    const playerData = await playerResponse.json();
    
    // Fetch player statistics
    const statsResponse = await fetch(`https://api.pandascore.co/${game}/players/${playerId}/stats`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    let playerStats = null;
    if (statsResponse.ok) {
      playerStats = await statsResponse.json();
      console.log(`✅ Retrieved player stats for ${playerId}`);
    }

    const enhancedPlayer: EnhancedPlayerData = {
      nickname: playerData.name || playerData.nickname || 'Unknown',
      player_id: playerId,
      name: playerData.name,
      slug: playerData.slug,
      image_url: playerData.image_url,
      nationality: playerData.nationality,
      role: playerData.role,
      team_id: playerData.current_team?.id?.toString(),
      team_name: playerData.current_team?.name,
      career_stats: playerStats?.career || {},
      recent_stats: playerStats?.recent || {},
      kda_ratio: playerStats?.averages?.kda_ratio,
      avg_kills: playerStats?.averages?.kills,
      avg_deaths: playerStats?.averages?.deaths,
      avg_assists: playerStats?.averages?.assists,
      position: mapPlayerRole(game, playerData.role || 'Player')
    };

    return enhancedPlayer;
  } catch (error) {
    console.error(`❌ Error fetching enhanced player data for ${playerId}:`, error);
    return null;
  }
};

// Store enhanced team data in database
const storeEnhancedTeamData = async (supabase: any, teamData: EnhancedTeamData) => {
  try {
    const dbData = {
      team_id: teamData.team_id,
      esport_type: teamData.esport_type,
      map_stats: teamData.map_stats || {},
      eco_round_win_rate: teamData.recent_stats?.eco_win_rate,
      save_round_win_rate: teamData.recent_stats?.save_win_rate,
      pistol_round_win_rate: teamData.recent_stats?.pistol_win_rate,
      recent_matches_count: teamData.recent_stats?.matches_count || 0,
      recent_win_rate: teamData.recent_stats?.win_rate,
      recent_avg_rating: teamData.recent_stats?.avg_rating,
      current_roster: teamData.roster_info?.current_roster || [],
      roster_changes: teamData.roster_info?.recent_changes || [],
      last_calculated_at: new Date().toISOString()
    };

    await supabase
      .from('pandascore_team_detailed_stats')
      .upsert(dbData, {
        onConflict: 'team_id,esport_type',
        ignoreDuplicates: false
      });

    console.log(`✅ Stored enhanced team data for ${teamData.team_id}`);
  } catch (error) {
    console.error(`❌ Error storing enhanced team data:`, error);
  }
};

// Store enhanced player data in database
const storeEnhancedPlayerData = async (supabase: any, playerData: EnhancedPlayerData, esportType: string) => {
  try {
    const dbData = {
      player_id: playerData.player_id,
      esport_type: esportType,
      name: playerData.name || playerData.nickname,
      slug: playerData.slug,
      image_url: playerData.image_url,
      nationality: playerData.nationality,
      role: playerData.role,
      team_id: playerData.team_id,
      team_name: playerData.team_name,
      career_stats: playerData.career_stats || {},
      recent_stats: playerData.recent_stats || {},
      kda_ratio: playerData.kda_ratio,
      avg_kills: playerData.avg_kills,
      avg_deaths: playerData.avg_deaths,
      avg_assists: playerData.avg_assists,
      last_synced_at: new Date().toISOString()
    };

    await supabase
      .from('pandascore_players')
      .upsert(dbData, {
        onConflict: 'player_id,esport_type',
        ignoreDuplicates: false
      });

    console.log(`✅ Stored enhanced player data for ${playerData.player_id}`);
  } catch (error) {
    console.error(`❌ Error storing enhanced player data:`, error);
  }
};

// Fixed: Changed 'cs2' to 'csgo' for proper Counter-Strike syncing
const SUPPORTED_GAMES = ['csgo', 'lol', 'dota2', 'valorant', 'ow'];

// Calculate and store team statistics
const calculateAndStoreTeamStats = async (supabase: any, games: string[]) => {
  console.log('🧮 Starting team statistics calculation...');
  
  for (const game of games) {
    try {
      console.log(`📊 Calculating stats for ${game}...`);
      
      // Get all unique teams for this game
      const { data: matches, error } = await supabase
        .from('pandascore_matches')
        .select('teams, raw_data, start_time')
        .eq('esport_type', game)
        .gte('start_time', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 6 months
        .order('start_time', { ascending: false })
        .limit(200);

      if (error) {
        console.error(`❌ Error fetching matches for ${game}:`, error);
        continue;
      }

      const teamStats = new Map<string, any>();
      const headToHeadMap = new Map<string, any>();

      // Process matches to calculate team stats
      for (const match of matches || []) {
        const teams = match.teams as any;
        const rawData = match.raw_data as any;
        
        if (!teams || !rawData) continue;

        const team1 = teams.team1;
        const team2 = teams.team2;
        
        if (!team1?.id || !team2?.id) continue;

        const team1Id = String(team1.id);
        const team2Id = String(team2.id);

        // Initialize team stats if not exists
        if (!teamStats.has(team1Id)) {
          teamStats.set(team1Id, {
            team_id: team1Id,
            esport_type: game,
            wins: 0,
            losses: 0,
            total_matches: 0,
            recent_matches: [],
            tournament_wins: new Set()
          });
        }

        if (!teamStats.has(team2Id)) {
          teamStats.set(team2Id, {
            team_id: team2Id,
            esport_type: game,
            wins: 0,
            losses: 0,
            total_matches: 0,
            recent_matches: [],
            tournament_wins: new Set()
          });
        }

        // Determine winner
        const winnerId = String(rawData.winner_id || '');
        const team1Won = winnerId === team1Id;
        const team2Won = winnerId === team2Id;

        // Update team stats
        const team1Stats = teamStats.get(team1Id);
        const team2Stats = teamStats.get(team2Id);

        if (team1Won) {
          team1Stats.wins++;
          team2Stats.losses++;
          team1Stats.recent_matches.push('W');
          team2Stats.recent_matches.push('L');
          if (match.tournament_name) {
            team1Stats.tournament_wins.add(match.tournament_name);
          }
        } else if (team2Won) {
          team2Stats.wins++;
          team1Stats.losses++;
          team2Stats.recent_matches.push('W');
          team1Stats.recent_matches.push('L');
          if (match.tournament_name) {
            team2Stats.tournament_wins.add(match.tournament_name);
          }
        }

        team1Stats.total_matches++;
        team2Stats.total_matches++;

        // Calculate head-to-head
        const h2hKey = team1Id < team2Id ? `${team1Id}_${team2Id}` : `${team2Id}_${team1Id}`;
        if (!headToHeadMap.has(h2hKey)) {
          headToHeadMap.set(h2hKey, {
            team1_id: team1Id < team2Id ? team1Id : team2Id,
            team2_id: team1Id < team2Id ? team2Id : team1Id,
            esport_type: game,
            team1_wins: 0,
            team2_wins: 0,
            total_matches: 0
          });
        }

        const h2hStats = headToHeadMap.get(h2hKey);
        h2hStats.total_matches++;

        if (team1Won) {
          if (team1Id < team2Id) {
            h2hStats.team1_wins++;
          } else {
            h2hStats.team2_wins++;
          }
        } else if (team2Won) {
          if (team2Id < team1Id) {
            h2hStats.team1_wins++;
          } else {
            h2hStats.team2_wins++;
          }
        }
      }

      // Store team statistics
      for (const [teamId, stats] of teamStats) {
        const winRate = stats.total_matches > 0 ? Math.round((stats.wins / stats.total_matches) * 100) : 0;
        const recentForm = stats.recent_matches.slice(0, 5).join('-');

        await supabase
          .from('pandascore_team_stats')
          .upsert({
            team_id: teamId,
            esport_type: game,
            win_rate: winRate,
            recent_form: recentForm,
            tournament_wins: stats.tournament_wins.size,
            total_matches: stats.total_matches,
            wins: stats.wins,
            losses: stats.losses,
            last_calculated_at: new Date().toISOString()
          }, {
            onConflict: 'team_id,esport_type',
            ignoreDuplicates: false
          });
      }

      // Store head-to-head records
      for (const [h2hKey, h2hStats] of headToHeadMap) {
        await supabase
          .from('pandascore_head_to_head')
          .upsert({
            ...h2hStats,
            last_calculated_at: new Date().toISOString()
          }, {
            onConflict: 'team1_id,team2_id,esport_type',
            ignoreDuplicates: false
          });
      }

      console.log(`✅ Calculated stats for ${teamStats.size} teams and ${headToHeadMap.size} head-to-head records in ${game}`);
      
    } catch (error) {
      console.error(`❌ Error calculating stats for ${game}:`, error);
    }
  }

  console.log('✅ Team statistics calculation completed');
};

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

                // Fetch enhanced team statistics (with rate limiting)
                let enhancedTeam1Data = null;
                let enhancedTeam2Data = null;
                
                if (team1Data?.id) {
                  enhancedTeam1Data = await fetchTeamDetailedStats(team1Data.id.toString(), game, apiKey);
                  await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
                }
                
                if (team2Data?.id) {
                  enhancedTeam2Data = await fetchTeamDetailedStats(team2Data.id.toString(), game, apiKey);
                  await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
                }

                // Fetch enhanced player data for all players
                const enhancedPlayers = [];
                for (const players of [team1Players, team2Players]) {
                  for (const player of players) {
                    if (player.player_id) {
                      const enhancedPlayer = await fetchPlayerDetailedData(player.player_id, game, apiKey);
                      if (enhancedPlayer) {
                        enhancedPlayers.push(enhancedPlayer);
                      }
                      await new Promise(resolve => setTimeout(resolve, 150)); // Rate limiting
                    }
                  }
                }

                // Store enhanced data
                if (enhancedTeam1Data) {
                  await storeEnhancedTeamData(supabase, enhancedTeam1Data);
                }
                if (enhancedTeam2Data) {
                  await storeEnhancedTeamData(supabase, enhancedTeam2Data);
                }
                for (const enhancedPlayer of enhancedPlayers) {
                  await storeEnhancedPlayerData(supabase, enhancedPlayer, game);
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

    // Calculate and store team statistics after match sync
    console.log('🧮 Starting team statistics calculation...');
    await calculateAndStoreTeamStats(supabase, SUPPORTED_GAMES);
    
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
