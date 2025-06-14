import { supabase } from '@/integrations/supabase/client';
import { MatchInfo, TeamInfo } from '@/components/MatchCard';
import { 
  fetchUpcomingMatches as apiUpcomingMatches,
  fetchLiveMatches as apiLiveMatches
} from '@/lib/pandaScoreApi';

// Cache TTL constants (in milliseconds)
const CACHE_TTL = {
  MATCHES: 15 * 60 * 1000,      // 15 minutes
  TEAMS: 2 * 60 * 60 * 1000,   // 2 hours
  TOURNAMENTS: 6 * 60 * 60 * 1000, // 6 hours
};

/**
 * Check if data is stale based on last_synced_at timestamp
 */
function isDataStale(lastSyncedAt: string, ttl: number): boolean {
  const lastSync = new Date(lastSyncedAt).getTime();
  const now = Date.now();
  return (now - lastSync) > ttl;
}

/**
 * Fetch upcoming matches with database-first approach
 */
export async function fetchUpcomingMatches(esportType: string): Promise<MatchInfo[]> {
  try {
    console.log(`🔍 Fetching upcoming matches for ${esportType} from database...`);
    
    // First, try to get data from database
    const { data: dbMatches, error } = await supabase
      .from('pandascore_matches')
      .select('*')
      .eq('esport_type', esportType)
      .in('status', ['scheduled', 'not_started'])
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Database error, falling back to API:', error);
      return apiUpcomingMatches(esportType);
    }

    // Check if data is fresh
    if (dbMatches && dbMatches.length > 0) {
      const latestSync = Math.max(...dbMatches.map(match => 
        new Date(match.last_synced_at).getTime()
      ));
      
      if (!isDataStale(new Date(latestSync).toISOString(), CACHE_TTL.MATCHES)) {
        console.log(`✅ Using fresh database data (${dbMatches.length} matches)`);
        
        // Transform database data to MatchInfo format
        const transformedMatches = dbMatches.map((match) => {
          // Safely extract team data from stored JSON
          const teamsData = match.teams as any;
          const team1: TeamInfo = {
            name: teamsData?.team1?.name || 'TBD',
            id: teamsData?.team1?.id,
            logo: teamsData?.team1?.logo || '/placeholder.svg'
          };
          const team2: TeamInfo = {
            name: teamsData?.team2?.name || 'TBD', 
            id: teamsData?.team2?.id,
            logo: teamsData?.team2?.logo || '/placeholder.svg'
          };

          return {
            id: match.match_id,
            teams: [team1, team2] as [TeamInfo, TeamInfo],
            startTime: match.start_time,
            tournament: match.tournament_name || 'Unknown Tournament',
            esportType: match.esport_type,
            bestOf: match.number_of_games || 3,
            homeTeamPlayers: [],
            awayTeamPlayers: []
          };
        });
        
        return transformedMatches;
      }
    }

    console.log('💡 Data is stale or empty, falling back to API...');
    return apiUpcomingMatches(esportType);

  } catch (error) {
    console.error('Error in hybrid fetch, falling back to API:', error);
    return apiUpcomingMatches(esportType);
  }
}

/**
 * Fetch live matches with database-first approach
 */
export async function fetchLiveMatches(esportType: string): Promise<MatchInfo[]> {
  try {
    console.log(`🔍 Fetching live matches for ${esportType} from database...`);
    
    // First, try to get data from database
    const { data: dbMatches, error } = await supabase
      .from('pandascore_matches')
      .select('*')
      .eq('esport_type', esportType)
      .in('status', ['running', 'live'])
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Database error, falling back to API:', error);
      return apiLiveMatches(esportType);
    }

    // For live matches, use shorter cache TTL (5 minutes)
    if (dbMatches && dbMatches.length > 0) {
      const latestSync = Math.max(...dbMatches.map(match => 
        new Date(match.last_synced_at).getTime()
      ));
      
      if (!isDataStale(new Date(latestSync).toISOString(), 5 * 60 * 1000)) {
        console.log(`✅ Using fresh database live data (${dbMatches.length} matches)`);
        
        // Transform database data to MatchInfo format
        const transformedMatches = dbMatches.map((match) => {
          const teamsData = match.teams as any;
          const team1: TeamInfo = {
            name: teamsData?.team1?.name || 'TBD',
            id: teamsData?.team1?.id,
            logo: teamsData?.team1?.logo || '/placeholder.svg'
          };
          const team2: TeamInfo = {
            name: teamsData?.team2?.name || 'TBD',
            id: teamsData?.team2?.id,
            logo: teamsData?.team2?.logo || '/placeholder.svg'
          };

          return {
            id: match.match_id,
            teams: [team1, team2] as [TeamInfo, TeamInfo],
            startTime: match.start_time,
            tournament: match.tournament_name || 'Unknown Tournament',
            esportType: match.esport_type,
            bestOf: match.number_of_games || 3,
            homeTeamPlayers: [],
            awayTeamPlayers: []
          };
        });
        
        return transformedMatches;
      }
    }

    console.log('💡 Live data is stale or empty, falling back to API...');
    return apiLiveMatches(esportType);

  } catch (error) {
    console.error('Error in hybrid live fetch, falling back to API:', error);
    return apiLiveMatches(esportType);
  }
}

/**
 * Fetch team by ID with database-first approach
 */
export async function fetchTeamById(teamId: string, esportType: string) {
  try {
    console.log(`🔍 Fetching team ${teamId} from database...`);
    
    // First, try to get data from database
    const { data: dbTeams, error } = await supabase
      .from('pandascore_teams')
      .select('*')
      .eq('team_id', teamId)
      .eq('esport_type', esportType)
      .order('last_synced_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Database error for team fetch:', error);
      return null;
    }

    // Check if data is fresh
    if (dbTeams && dbTeams.length > 0) {
      const team = dbTeams[0];
      
      if (!isDataStale(team.last_synced_at, CACHE_TTL.TEAMS)) {
        console.log(`✅ Using fresh database team data`);
        
        // Transform database data to expected format
        const rawData = team.raw_data as any || {};
        return {
          id: team.team_id,
          name: team.name,
          acronym: team.acronym,
          image_url: team.logo_url,
          slug: team.slug,
          players: team.players_data || [],
          ...rawData
        };
      }
    }

    console.log('💡 Team data is stale or empty, no fallback available');
    return null;

  } catch (error) {
    console.error('Error in hybrid team fetch:', error);
    return null;
  }
}

/**
 * Fetch tournaments with database-first approach
 */
export async function fetchTournaments(esportType: string) {
  try {
    console.log(`🔍 Fetching tournaments for ${esportType} from database...`);
    
    // First, try to get data from database
    const { data: dbTournaments, error } = await supabase
      .from('pandascore_tournaments')
      .select('*')
      .eq('esport_type', esportType)
      .order('last_synced_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Database error for tournaments fetch:', error);
      return [];
    }

    // Check if data is fresh
    if (dbTournaments && dbTournaments.length > 0) {
      const latestSync = Math.max(...dbTournaments.map(tournament => 
        new Date(tournament.last_synced_at).getTime()
      ));
      
      if (!isDataStale(new Date(latestSync).toISOString(), CACHE_TTL.TOURNAMENTS)) {
        console.log(`✅ Using fresh database tournaments data (${dbTournaments.length} tournaments)`);
        
        // Transform database data to expected format
        const transformedTournaments = dbTournaments.map((tournament) => {
          const rawData = tournament.raw_data as any || {};
          return {
            id: tournament.tournament_id,
            name: tournament.name,
            slug: tournament.slug,
            league: {
              id: tournament.league_id,
              name: tournament.league_name,
              image_url: tournament.image_url
            },
            serie: {
              id: tournament.serie_id,
              name: tournament.serie_name
            },
            begin_at: tournament.start_date,
            end_at: tournament.end_date,
            tier: tournament.status,
            ...rawData
          };
        });
        
        return transformedTournaments;
      }
    }

    console.log('💡 Tournament data is stale or empty, returning empty array');
    return [];

  } catch (error) {
    console.error('Error in hybrid tournament fetch:', error);
    return [];
  }
}

/**
 * Get sync statistics
 */
export async function getSyncStats() {
  try {
    const { data: logs, error } = await supabase
      .from('pandascore_sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching sync logs:', error);
      return null;
    }

    return logs;
  } catch (error) {
    console.error('Error getting sync stats:', error);
    return null;
  }
}

/**
 * Fetch PandaScore match details by ID from database
 */
export async function fetchSupabasePandaScoreMatchDetails(matchId: string) {
  try {
    console.log(`🔍 Fetching PandaScore match details for ID: ${matchId}`);
    
    const { data: match, error } = await supabase
      .from('pandascore_matches')
      .select('*')
      .eq('match_id', matchId)
      .single();

    if (error) {
      console.error('Database error fetching PandaScore match:', error);
      return null;
    }

    if (!match) {
      console.log('No PandaScore match found in database');
      return null;
    }

    // Transform database data to match our interface
    const teamsData = match.teams as any;
    const team1 = {
      name: teamsData?.team1?.name || 'TBD',
      id: teamsData?.team1?.id,
      logo: teamsData?.team1?.logo || '/placeholder.svg',
      players: teamsData?.team1?.players || []
    };
    const team2 = {
      name: teamsData?.team2?.name || 'TBD',
      id: teamsData?.team2?.id,
      logo: teamsData?.team2?.logo || '/placeholder.svg',
      players: teamsData?.team2?.players || []
    };

    const transformedMatch = {
      id: match.match_id,
      teams: [team1, team2],
      startTime: match.start_time,
      tournament: match.tournament_name || match.league_name || 'Professional Tournament',
      esportType: match.esport_type,
      bestOf: match.number_of_games || 3,
      status: match.status,
      rawData: match.raw_data
    };

    console.log('✅ PandaScore match details transformed:', transformedMatch);
    return transformedMatch;

  } catch (error) {
    console.error('Error fetching PandaScore match details:', error);
    return null;
  }
}
