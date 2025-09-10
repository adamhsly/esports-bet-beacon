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
 * TODO: Implement sportdevs_matches table
 */
export async function fetchUpcomingMatches(esportType: string): Promise<MatchInfo[]> {
  try {
    console.log(`🔍 Fetching upcoming matches for ${esportType} (API only - database not implemented)...`);
    
    // TODO: Implement sportdevs_matches table
    // For now, fall back to API directly
    return apiUpcomingMatches(esportType);

  } catch (error) {
    console.error('Error in SportDevs fetch, falling back to API:', error);
    return apiUpcomingMatches(esportType);
  }
}

/**
 * Fetch team by ID with database-first approach
 * TODO: Implement sportdevs_teams table
 */
export async function fetchTeamById(teamId: string) {
  try {
    console.log(`🔍 Fetching team ${teamId} (API only - database not implemented)...`);
    
    // TODO: Implement sportdevs_teams table
    // For now, fall back to API directly
    return apiTeamById(teamId);

  } catch (error) {
    console.error('Error in SportDevs team fetch, falling back to API:', error);
    return apiTeamById(teamId);
  }
}

/**
 * Fetch players by team ID with database-first approach
 * TODO: Implement sportdevs_teams table
 */
export async function fetchPlayersByTeamId(teamId: string | number) {
  try {
    const cleanTeamId = String(teamId).trim();
    console.log(`🔍 Fetching players for team ${cleanTeamId} (API only - database not implemented)...`);
    
    // TODO: Implement sportdevs_teams table
    // For now, fall back to API directly
    return apiPlayersByTeamId(teamId);

  } catch (error) {
    console.error('Error in SportDevs players fetch, falling back to API:', error);
    return apiPlayersByTeamId(teamId);
  }
}

/**
 * Fetch tournament by ID with database-first approach
 * TODO: Implement sportdevs_tournaments table
 */
export async function fetchTournamentById(tournamentId: string) {
  try {
    console.log(`🔍 Fetching tournament ${tournamentId} (API only - database not implemented)...`);
    
    // TODO: Implement sportdevs_tournaments table
    // For now, fall back to API directly
    return apiTournamentById(tournamentId);

  } catch (error) {
    console.error('Error in SportDevs tournament fetch, falling back to API:', error);
    return apiTournamentById(tournamentId);
  }
}

/**
 * Get sync statistics
 * TODO: Implement sportdevs_sync_logs table
 */
export async function getSyncStats() {
  try {
    // TODO: Implement sportdevs_sync_logs table
    console.log('Sync stats not implemented - database tables not created yet');
    return null;
  } catch (error) {
    console.error('Error getting sync stats:', error);
    return null;
  }
}
