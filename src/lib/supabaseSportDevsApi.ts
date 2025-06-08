
import { supabase } from '@/integrations/supabase/client';
import { MatchInfo, TeamInfo } from '@/components/MatchCard';
import { 
  fetchUpcomingMatches as apiUpcomingMatches,
  fetchTeamById as apiTeamById,
  fetchPlayersByTeamId as apiPlayersByTeamId,
  fetchTournamentById as apiTournamentById
} from '@/lib/sportDevsApi';

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
      .from('sportdevs_matches')
      .select('*')
      .eq('esport_type', esportType)
      .eq('status', 'scheduled')
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
        const transformedMatches = await Promise.all(
          dbMatches.map(async (match) => {
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

            // Fetch players for teams if we have team IDs
            let homeTeamPlayers = [];
            let awayTeamPlayers = [];
            
            try {
              if (team1.id) {
                homeTeamPlayers = await fetchPlayersByTeamId(team1.id);
              }
              if (team2.id) {
                awayTeamPlayers = await fetchPlayersByTeamId(team2.id);
              }
            } catch (error) {
              console.log('Could not fetch players:', error);
            }

            return {
              id: match.match_id,
              teams: [team1, team2] as [TeamInfo, TeamInfo],
              startTime: match.start_time,
              tournament: match.tournament_name || 'Unknown Tournament',
              esportType: match.esport_type,
              bestOf: match.best_of || 3,
              homeTeamPlayers,
              awayTeamPlayers
            };
          })
        );
        
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
 * Fetch team by ID with database-first approach
 */
export async function fetchTeamById(teamId: string) {
  try {
    console.log(`🔍 Fetching team ${teamId} from database...`);
    
    // First, try to get data from database
    const { data: dbTeams, error } = await supabase
      .from('sportdevs_teams')
      .select('*')
      .eq('team_id', teamId)
      .order('last_synced_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Database error, falling back to API:', error);
      return apiTeamById(teamId);
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
          image_url: team.logo_url,
          hash_image: team.hash_image,
          players: team.players_data || [],
          ...rawData
        };
      }
    }

    console.log('💡 Team data is stale or empty, falling back to API...');
    return apiTeamById(teamId);

  } catch (error) {
    console.error('Error in hybrid team fetch, falling back to API:', error);
    return apiTeamById(teamId);
  }
}

/**
 * Fetch players by team ID with database-first approach
 */
export async function fetchPlayersByTeamId(teamId: string | number) {
  try {
    const cleanTeamId = String(teamId).trim();
    console.log(`🔍 Fetching players for team ${cleanTeamId} from database...`);
    
    // First, try to get data from database
    const { data: dbTeams, error } = await supabase
      .from('sportdevs_teams')
      .select('players_data, last_synced_at')
      .eq('team_id', cleanTeamId)
      .order('last_synced_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Database error, falling back to API:', error);
      return apiPlayersByTeamId(teamId);
    }

    // Check if data is fresh
    if (dbTeams && dbTeams.length > 0) {
      const team = dbTeams[0];
      const playersData = team.players_data as any[];
      
      if (!isDataStale(team.last_synced_at, CACHE_TTL.TEAMS) && playersData && Array.isArray(playersData)) {
        console.log(`✅ Using fresh database players data (${playersData.length} players)`);
        return playersData;
      }
    }

    console.log('💡 Players data is stale or empty, falling back to API...');
    return apiPlayersByTeamId(teamId);

  } catch (error) {
    console.error('Error in hybrid players fetch, falling back to API:', error);
    return apiPlayersByTeamId(teamId);
  }
}

/**
 * Fetch tournament by ID with database-first approach
 */
export async function fetchTournamentById(tournamentId: string) {
  try {
    console.log(`🔍 Fetching tournament ${tournamentId} from database...`);
    
    // First, try to get data from database
    const { data: dbTournaments, error } = await supabase
      .from('sportdevs_tournaments')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('last_synced_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Database error, falling back to API:', error);
      return apiTournamentById(tournamentId);
    }

    // Check if data is fresh
    if (dbTournaments && dbTournaments.length > 0) {
      const tournament = dbTournaments[0];
      
      if (!isDataStale(tournament.last_synced_at, CACHE_TTL.TOURNAMENTS)) {
        console.log(`✅ Using fresh database tournament data`);
        
        // Transform database data to expected format
        const rawData = tournament.raw_data as any || {};
        return {
          id: tournament.tournament_id,
          name: tournament.name,
          status: tournament.status,
          start_date: tournament.start_date,
          end_date: tournament.end_date,
          image_url: tournament.image_url,
          hash_image: tournament.hash_image,
          ...rawData
        };
      }
    }

    console.log('💡 Tournament data is stale or empty, falling back to API...');
    return apiTournamentById(tournamentId);

  } catch (error) {
    console.error('Error in hybrid tournament fetch, falling back to API:', error);
    return apiTournamentById(tournamentId);
  }
}

/**
 * Get sync statistics
 */
export async function getSyncStats() {
  try {
    const { data: logs, error } = await supabase
      .from('sportdevs_sync_logs')
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
