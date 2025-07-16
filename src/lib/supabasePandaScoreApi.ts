
import { supabase } from '@/integrations/supabase/client';
import { fromUTCString, getMostRecentMatchDate } from '@/utils/timezoneUtils';

interface PandaScoreMatch {
  id: string;
  match_id: string;
  esport_type: string;
  esportType: string; // Alias for component compatibility
  teams: Array<{
    id?: string;
    name: string;
    logo?: string;
    acronym?: string;
    players?: Array<{
      nickname: string;
      player_id: string;
      position?: string;
      role?: string;
    }>;
    roster?: Array<{
      nickname: string;
      player_id: string;
      position?: string;
      role?: string;
    }>;
  }>;
  start_time: string;
  startTime: string; // Alias for component compatibility
  end_time?: string;
  finishedTime?: string;
  finished_at?: string;
  tournament_id?: string;
  tournament_name?: string;
  tournament?: string; // String version for component compatibility
  league_id?: string;
  league_name?: string;
  serie_id?: string;
  serie_name?: string;
  status: string;
  match_type?: string;
  number_of_games?: number;
  bestOf?: number;
  rawData?: any;
  results?: Array<{
    team_id: number;
    score: number;
  }>;
}

// Get PandaScore API key from localStorage or environment
const getPandaScoreApiKey = (): string => {
  return localStorage.getItem('esports_pandascore_api_key') || "kYJELuXydUWktzw8lPtGygWUKp7K6nB8pM2k8-sITtzcqLG4OHk";
};

// Fetch players from pandascore_players_master table by IDs
const fetchPlayersByIds = async (playerIds: number[]): Promise<any[]> => {
  if (!playerIds || playerIds.length === 0) {
    return [];
  }
  
  console.log(`👥 Fetching ${playerIds.length} players from pandascore_players_master:`, playerIds);
  
  try {
    // Use playerIds directly - no conversion needed for bigint column
    const { data: players, error } = await supabase
      .from('pandascore_players_master')
      .select('*')
      .in('id', playerIds);
    
    if (error) {
      console.error('❌ Error fetching players from pandascore_players_master:', error);
      console.error('❌ Error details:', error.details, error.hint, error.message);
      return [];
    }
    
    console.log(`📊 Query executed successfully. Found ${players?.length || 0} players`);
    
    if (!players || players.length === 0) {
      console.log(`⚠️ No players found for IDs: ${playerIds.join(', ')}`);
      // Let's try a different approach - query each ID individually to debug
      for (const id of playerIds) {
        const { data: singlePlayer, error: singleError } = await supabase
          .from('pandascore_players_master')
          .select('id, name')
          .eq('id', id)
          .limit(1);
        
        if (singleError) {
          console.error(`❌ Error fetching single player ${id}:`, singleError);
        } else {
          console.log(`🔍 Single player query for ID ${id}:`, singlePlayer);
        }
      }
      return [];
    }
    
    console.log(`✅ Retrieved ${players.length} players from pandascore_players_master`);
    return players;
  } catch (error) {
    console.error('❌ Error in fetchPlayersByIds:', error);
    return [];
  }
};

// Transform pandascore_players_master data to component format
const transformPlayerData = (player: any, esportType: string): any => {
  return {
    nickname: player.name || 'Unknown Player',
    player_id: player.id?.toString() || '',
    position: mapPlayerPosition(esportType, player.role || 'Player'),
    role: player.role || 'Player',
    first_name: player.first_name,
    last_name: player.last_name,
    nationality: player.nationality,
    age: player.age,
    image_url: player.image_url,
    current_team_name: player.current_team_name,
    current_team_acronym: player.current_team_acronym
  };
};

// Fetch roster data using team_a_player_ids and team_b_player_ids from match
const fetchRosterDataFromPlayerIds = async (match: any): Promise<any> => {
  console.log(`🔍 Fetching roster data using player IDs for match ${match.match_id}...`);
  
  try {
    const teamAPlayerIds = match.team_a_player_ids || [];
    const teamBPlayerIds = match.team_b_player_ids || [];
    
    console.log(`👥 Team A player IDs (${teamAPlayerIds.length}):`, teamAPlayerIds);
    console.log(`👥 Team B player IDs (${teamBPlayerIds.length}):`, teamBPlayerIds);
    
    // Fetch players for both teams
    const [teamAPlayers, teamBPlayers] = await Promise.all([
      fetchPlayersByIds(teamAPlayerIds),
      fetchPlayersByIds(teamBPlayerIds)
    ]);
    
    console.log(`📊 Raw players fetched - Team A: ${teamAPlayers.length}, Team B: ${teamBPlayers.length}`);
    console.log(`📊 Team A raw players:`, teamAPlayers);
    console.log(`📊 Team B raw players:`, teamBPlayers);
    
    // Transform player data for components
    const transformedTeamAPlayers = teamAPlayers.map(player => 
      transformPlayerData(player, match.esport_type)
    );
    const transformedTeamBPlayers = teamBPlayers.map(player => 
      transformPlayerData(player, match.esport_type)
    );
    
    console.log(`✅ Retrieved ${transformedTeamAPlayers.length} players for Team A, ${transformedTeamBPlayers.length} players for Team B`);
    console.log(`📊 Transformed Team A players:`, transformedTeamAPlayers);
    console.log(`📊 Transformed Team B players:`, transformedTeamBPlayers);
    
    return {
      teamAPlayers: transformedTeamAPlayers,
      teamBPlayers: transformedTeamBPlayers
    };
  } catch (error) {
    console.error(`❌ Error fetching roster data for match ${match.match_id}:`, error);
    return {
      teamAPlayers: [],
      teamBPlayers: []
    };
  }
};

// Map player roles to position names based on game type
const mapPlayerPosition = (esportType: string, role: string): string => {
  const gameMappings: Record<string, Record<string, string>> = {
    'dota2': {
      '1': 'Carry',
      '2': 'Mid',
      '3': 'Offlaner', 
      '4': 'Support',
      '5': 'Hard Support',
      'carry': 'Carry',
      'mid': 'Mid',
      'offlaner': 'Offlaner',
      'support': 'Support',
      'hard_support': 'Hard Support',
      'core': 'Core'
    },
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
    'ow': {
      'tank': 'Tank',
      'dps': 'DPS',
      'damage': 'DPS',
      'support': 'Support',
      'flex': 'Flex'
    }
  };
  
  const mapping = gameMappings[esportType] || {};
  return mapping[role.toLowerCase()] || 'Player';
};

// Transform database match data to component format with roster data from player IDs
const transformMatchData = async (dbMatch: any): Promise<PandaScoreMatch> => {
  console.log(`🔄 Transforming match data for ${dbMatch.match_id}:`, dbMatch);
  
  // Extract team data using helper function (supports both formats)
  const team1 = extractTeamData(dbMatch.teams, 0);
  const team2 = extractTeamData(dbMatch.teams, 1);
  
  // Fetch roster data using player IDs from the match
  const rosterData = await fetchRosterDataFromPlayerIds(dbMatch);
  
  const transformedMatch: PandaScoreMatch = {
    id: `pandascore_${dbMatch.match_id}`,
    match_id: dbMatch.match_id,
    esport_type: dbMatch.esport_type,
    esportType: dbMatch.esport_type, // Alias for component compatibility
    teams: [
      {
        id: team1.id,
        name: team1.name || 'Team 1',
        logo: team1.logo || team1.image_url,
        acronym: team1.acronym,
        players: rosterData.teamAPlayers
      },
      {
        id: team2.id,
        name: team2.name || 'Team 2', 
        logo: team2.logo || team2.image_url,
        acronym: team2.acronym,
        players: rosterData.teamBPlayers
      }
    ],
    start_time: dbMatch.start_time,
    startTime: dbMatch.start_time, // Alias for component compatibility
    end_time: dbMatch.end_time,
    finishedTime: dbMatch.end_time,
    finished_at: dbMatch.end_time,
    tournament_id: dbMatch.tournament_id,
    tournament_name: dbMatch.tournament_name,
    tournament: dbMatch.tournament_name || 'Pro Match', // String version for component compatibility
    league_id: dbMatch.league_id,
    league_name: dbMatch.league_name,
    serie_id: dbMatch.serie_id,
    serie_name: dbMatch.serie_name,
    status: dbMatch.status,
    match_type: dbMatch.match_type,
    number_of_games: dbMatch.number_of_games,
    bestOf: dbMatch.number_of_games || 3,
    rawData: dbMatch.raw_data,
    results: [] // Initialize empty results array
  };
  
  console.log(`✅ Transformed match data:`, {
    matchId: transformedMatch.match_id,
    esportType: transformedMatch.esport_type,
    team1Players: transformedMatch.teams[0].players?.length || 0,
    team2Players: transformedMatch.teams[1].players?.length || 0
  });
  
  return transformedMatch;
};

// Helper function to extract team data from both legacy and new formats
const extractTeamData = (teams: any, index: number) => {
  if (!teams) return {};
  
  // New array format: [{"type": "Team", "opponent": {...}}, ...]
  if (Array.isArray(teams)) {
    const teamEntry = teams[index];
    if (teamEntry?.opponent) {
      return {
        id: teamEntry.opponent.id?.toString(),
        name: teamEntry.opponent.name,
        logo: teamEntry.opponent.image_url,
        image_url: teamEntry.opponent.image_url,
        acronym: teamEntry.opponent.acronym,
        slug: teamEntry.opponent.slug,
        location: teamEntry.opponent.location
      };
    }
    return {};
  }
  
  // Legacy object format: {team1: {...}, team2: {...}}
  const teamKey = index === 0 ? 'team1' : 'team2';
  return teams[teamKey] || {};
};
export async function fetchSupabasePandaScoreMatches(esportType: string): Promise<PandaScoreMatch[]> {
  try {
    console.log(`📥 Fetching PandaScore matches for ${esportType} from Supabase...`);
    
    // STEP 1: Add detailed logging for debugging
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    console.log(`🔍 DEBUG: Query parameters for ${esportType}:`);
    console.log(`  - Start date (7 days ago): ${sevenDaysAgo}`);
    console.log(`  - End date (30 days from now): ${thirtyDaysFromNow}`);
    console.log(`  - Esport type: ${esportType}`);
    
    // STEP 2: Start with simple query first to test basic functionality
    console.log(`🔍 DEBUG: Testing basic query without date filters...`);
    const { data: testMatches, error: testError } = await supabase
      .from('pandascore_matches')
      .select('count(*)')
      .eq('esport_type', esportType);
    
    if (testError) {
      console.error(`❌ Basic test query failed:`, testError);
      return [];
    }
    
    console.log(`🔍 DEBUG: Basic query result for ${esportType}:`, testMatches);
    
    // STEP 3: Test with date filters
    console.log(`🔍 DEBUG: Testing with date filters...`);
    const { data: matches, error } = await supabase
      .from('pandascore_matches')
      .select('*')
      .eq('esport_type', esportType)
      .gte('start_time', sevenDaysAgo)
      .lte('start_time', thirtyDaysFromNow)
      .order('start_time', { ascending: true });

    if (error) {
      console.error(`❌ Error fetching PandaScore matches for ${esportType}:`, error);
      console.error(`❌ Full error details:`, JSON.stringify(error, null, 2));
      return [];
    }

    if (!matches || matches.length === 0) {
      console.log(`⚠️ No PandaScore matches found for ${esportType} in date range`);
      console.log('🔍 DEBUG: Query details:', {
        esportType,
        sevenDaysAgo,
        thirtyDaysFromNow,
        queryExecuted: true
      });
      return [];
    }

    console.log(`✅ Retrieved ${matches.length} PandaScore matches for ${esportType} in date range`);
    console.log('🔍 DEBUG: Sample match data:', {
      firstMatch: matches[0],
      matchTypes: [...new Set(matches.map(m => m.esport_type))],
      matchStatuses: [...new Set(matches.map(m => m.status))],
      dateRange: {
        earliest: Math.min(...matches.map(m => new Date(m.start_time).getTime())),
        latest: Math.max(...matches.map(m => new Date(m.start_time).getTime()))
      }
    });
    
    // Transform matches with roster data
    const transformedMatches = await Promise.all(
      matches.map(async (match) => {
        return await transformMatchData(match);
      })
    );
    
    return transformedMatches;
  } catch (error) {
    console.error('❌ Error in fetchSupabasePandaScoreMatches:', error);
    throw error;
  }
}

export async function fetchSupabasePandaScoreMatchDetails(matchId: string): Promise<PandaScoreMatch | null> {
  try {
    console.log(`🔍 Fetching PandaScore match details for ${matchId} from Supabase...`);
    
    // Clean match ID for database query
    const cleanMatchId = matchId.replace('pandascore_', '');
    
    const { data: match, error } = await supabase
      .from('pandascore_matches')
      .select('*')
      .eq('match_id', cleanMatchId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching PandaScore match details:', error);
      throw error;
    }

    if (!match) {
      console.log(`⚠️ PandaScore match ${matchId} not found in database`);
      return null;
    }

    console.log(`✅ Retrieved PandaScore match details for ${matchId}:`, match);
    
    // Transform the data with roster data from player IDs
    const transformedMatch = await transformMatchData(match);
    
    return transformedMatch;
  } catch (error) {
    console.error('❌ Error in fetchSupabasePandaScoreMatchDetails:', error);
    throw error;
  }
}

export async function fetchSupabasePandaScoreUpcomingMatches(): Promise<PandaScoreMatch[]> {
  try {
    console.log('📥 Fetching upcoming PandaScore matches from Supabase...');
    
    const now = new Date().toISOString();
    
    const { data: matches, error } = await supabase
      .from('pandascore_matches')
      .select('*')
      .gte('start_time', now)
      .in('status', ['scheduled', 'not_started'])
      .order('start_time', { ascending: true })
      .limit(50);

    if (error) {
      console.error('❌ Error fetching upcoming PandaScore matches:', error);
      throw error;
    }

    if (!matches || matches.length === 0) {
      console.log('⚠️ No upcoming PandaScore matches found');
      return [];
    }

    console.log(`✅ Retrieved ${matches.length} upcoming PandaScore matches`);
    
    // Transform with roster data
    const transformedMatches = await Promise.all(
      matches.map(async (match) => {
        return await transformMatchData(match);
      })
    );
    
    return transformedMatches;
  } catch (error) {
    console.error('❌ Error in fetchSupabasePandaScoreUpcomingMatches:', error);
    throw error;
  }
}

export async function fetchSupabasePandaScoreLiveMatches(): Promise<PandaScoreMatch[]> {
  try {
    console.log('📥 Fetching live PandaScore matches from Supabase...');
    
    const { data: matches, error } = await supabase
      .from('pandascore_matches')
      .select('*')
      .eq('status', 'running')
      .order('start_time', { ascending: true })
      .limit(20);

    if (error) {
      console.error('❌ Error fetching live PandaScore matches:', error);
      throw error;
    }

    if (!matches || matches.length === 0) {
      console.log('⚠️ No live PandaScore matches found');
      return [];
    }

    console.log(`✅ Retrieved ${matches.length} live PandaScore matches`);
    
    // Transform with roster data
    const transformedMatches = await Promise.all(
      matches.map(async (match) => {
        return await transformMatchData(match);
      })
    );
    
    return transformedMatches;
  } catch (error) {
    console.error('❌ Error in fetchSupabasePandaScoreLiveMatches:', error);
    throw error;
  }
}
