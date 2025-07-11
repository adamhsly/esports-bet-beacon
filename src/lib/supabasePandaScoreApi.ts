
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

// Fetch tournament rosters from PandaScore API
const fetchTournamentRosters = async (tournamentId: string): Promise<any> => {
  console.log(`🏆 Fetching PandaScore tournament rosters for tournament ${tournamentId}...`);
  
  try {
    const apiKey = getPandaScoreApiKey();
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
    console.log(`✅ Successfully fetched rosters for tournament ${tournamentId}:`, rostersResponse);
    
    return rostersResponse;
  } catch (error) {
    console.error(`❌ Error fetching tournament rosters for ${tournamentId}:`, error);
    return null;
  }
};

// Extract player data from tournament rosters for a specific team
const extractPlayersFromRosters = (rostersResponse: any, teamId: string, esportType: string): any[] => {
  if (!rostersResponse || !rostersResponse.rosters || !Array.isArray(rostersResponse.rosters)) {
    console.log(`⚠️ Invalid rosters response structure`);
    return [];
  }

  for (const roster of rostersResponse.rosters) {
    if (!roster || typeof roster !== 'object') {
      continue;
    }
    
    if (roster.id?.toString() === teamId.toString()) {
      const players = roster.players || [];
      console.log(`🎯 Found ${players.length} players for team ${teamId} in tournament rosters`);
      
      return players.map((player: any) => ({
        nickname: player.name || 'Unknown Player',
        player_id: player.id?.toString() || '',
        position: mapPlayerPosition(esportType, player.role || 'Player'),
        role: player.role || 'Player'
      }));
    }
  }
  
  console.log(`⚠️ Team ${teamId} not found in tournament rosters`);
  return [];
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

// Fetch missing roster data from PandaScore API
const fetchMissingRosterData = async (match: any): Promise<any> => {
  console.log(`🔍 Checking if roster data needs to be fetched for match ${match.match_id}...`);
  
  const team1HasPlayers = match.teams?.[0]?.players?.length > 0;
  const team2HasPlayers = match.teams?.[1]?.players?.length > 0;
  
  // If both teams already have player data, no need to fetch
  if (team1HasPlayers && team2HasPlayers) {
    console.log(`✅ Match ${match.match_id} already has complete roster data`);
    return match;
  }
  
  // Only fetch if we have tournament ID
  if (!match.tournament_id) {
    console.log(`⚠️ Match ${match.match_id} has no tournament ID, cannot fetch roster data`);
    return match;
  }
  
  console.log(`📥 Fetching missing roster data for match ${match.match_id} from tournament ${match.tournament_id}...`);
  
  try {
    const rostersResponse = await fetchTournamentRosters(match.tournament_id);
    if (!rostersResponse) {
      console.log(`⚠️ Could not fetch rosters for tournament ${match.tournament_id}`);
      return match;
    }
    
    const updatedMatch = { ...match, teams: [...match.teams] };
    
    // Update team1 players if missing
    if (!team1HasPlayers && match.teams?.[0]?.id) {
      const team1Players = extractPlayersFromRosters(rostersResponse, match.teams[0].id, match.esport_type);
      if (team1Players.length > 0) {
        updatedMatch.teams[0] = { ...updatedMatch.teams[0], players: team1Players };
        console.log(`✅ Added ${team1Players.length} players to team1 (${match.teams[0].name})`);
      }
    }
    
    // Update team2 players if missing
    if (!team2HasPlayers && match.teams?.[1]?.id) {
      const team2Players = extractPlayersFromRosters(rostersResponse, match.teams[1].id, match.esport_type);
      if (team2Players.length > 0) {
        updatedMatch.teams[1] = { ...updatedMatch.teams[1], players: team2Players };
        console.log(`✅ Added ${team2Players.length} players to team2 (${match.teams[1].name})`);
      }
    }
    
    return updatedMatch;
  } catch (error) {
    console.error(`❌ Error fetching roster data for match ${match.match_id}:`, error);
    return match;
  }
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

// Transform database match data to component format
const transformMatchData = (dbMatch: any): PandaScoreMatch => {
  console.log(`🔄 Transforming match data for ${dbMatch.match_id}:`, dbMatch);
  
  // Extract team data using helper function (supports both formats)
  const team1 = extractTeamData(dbMatch.teams, 0);
  const team2 = extractTeamData(dbMatch.teams, 1);
  
  // Use roster data as players if players array is empty
  const team1Players = team1.players || team1.roster || [];
  const team2Players = team2.players || team2.roster || [];
  
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
        players: team1Players.map((player: any) => ({
          nickname: player.nickname || player.name || 'Unknown Player',
          player_id: player.player_id || player.id?.toString() || '',
          position: player.position || mapPlayerPosition(dbMatch.esport_type, player.role || 'Player'),
          role: player.role || 'Player'
        }))
      },
      {
        id: team2.id,
        name: team2.name || 'Team 2', 
        logo: team2.logo || team2.image_url,
        acronym: team2.acronym,
        players: team2Players.map((player: any) => ({
          nickname: player.nickname || player.name || 'Unknown Player',
          player_id: player.player_id || player.id?.toString() || '',
          position: player.position || mapPlayerPosition(dbMatch.esport_type, player.role || 'Player'),
          role: player.role || 'Player'
        }))
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

export async function fetchSupabasePandaScoreMatches(esportType: string): Promise<PandaScoreMatch[]> {
  try {
    console.log(`📥 Fetching PandaScore matches for ${esportType} from Supabase...`);
    
    const { data: matches, error } = await supabase
      .from('pandascore_matches')
      .select('*')
      .eq('esport_type', esportType)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('❌ Error fetching PandaScore matches:', error);
      throw error;
    }

    if (!matches || matches.length === 0) {
      console.log(`⚠️ No PandaScore matches found for ${esportType}`);
      return [];
    }

    console.log(`✅ Retrieved ${matches.length} PandaScore matches for ${esportType}`);
    
    // Transform and potentially fetch missing roster data
    const transformedMatches = await Promise.all(
      matches.map(async (match) => {
        const transformedMatch = transformMatchData(match);
        // Attempt to fetch missing roster data if needed
        return await fetchMissingRosterData(transformedMatch);
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
    
    // Transform the data and fetch missing roster data if needed
    const transformedMatch = transformMatchData(match);
    const finalMatch = await fetchMissingRosterData(transformedMatch);
    
    return finalMatch;
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
    
    // Transform and fetch missing roster data
    const transformedMatches = await Promise.all(
      matches.map(async (match) => {
        const transformedMatch = transformMatchData(match);
        return await fetchMissingRosterData(transformedMatch);
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
      .in('status', ['running', 'live', 'ongoing'])
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
    
    // Transform and fetch missing roster data
    const transformedMatches = await Promise.all(
      matches.map(async (match) => {
        const transformedMatch = transformMatchData(match);
        return await fetchMissingRosterData(transformedMatch);
      })
    );
    
    return transformedMatches;
  } catch (error) {
    console.error('❌ Error in fetchSupabasePandaScoreLiveMatches:', error);
    throw error;
  }
}
