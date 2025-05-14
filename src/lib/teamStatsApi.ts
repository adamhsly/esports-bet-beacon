
import { memoryCache, createCachedFunction } from '@/utils/cacheUtils';
import { fetchFromSportDevs, getApiKey } from './sportDevsApi';

// Cache TTL for different types of data (in seconds)
const CACHE_TTL = {
  TEAM_MATCHES: 300,      // 5 minutes
  MATCH_LINEUPS: 600,     // 10 minutes
  PLAYER_STATS: 600,      // 10 minutes
  MATCH_STATS: 600        // 10 minutes
};

// Base URL for the SportDevs API
const WEB_URL = "https://esports.sportdevs.com";

/**
 * Fetch matches by team ID within a date range
 */
export async function _fetchMatchesByTeamAndDate(teamId: string, startDate: string, endDate: string) {
  try {
    console.log(`Fetching matches for team ${teamId} from ${startDate} to ${endDate}`);
    
    // Format for date filtering in API: YYYY-MM-DD
    const formattedStartDate = startDate;
    const formattedEndDate = endDate;
    
    const matches = await fetchFromSportDevs(
      `${WEB_URL}/matches?or=(home_team_id.eq.${teamId},away_team_id.eq.${teamId})&start_time=gte.${formattedStartDate}&start_time=lte.${formattedEndDate}&order=start_time.desc`,
      getApiKey()
    );
    
    console.log(`Found ${matches.length} matches for team ${teamId} in date range`);
    return matches;
  } catch (error) {
    console.error("Error fetching team matches by date:", error);
    throw error;
  }
}

/**
 * Fetch lineup data for a specific match
 */
export async function _fetchMatchLineups(matchId: string) {
  try {
    console.log(`Fetching lineups for match ${matchId}`);
    
    const lineups = await fetchFromSportDevs(
      `${WEB_URL}/matches-lineups?match_id=eq.${matchId}`,
      getApiKey()
    );
    
    console.log(`Found lineup data for match ${matchId}`);
    return lineups;
  } catch (error) {
    console.error("Error fetching match lineups:", error);
    throw error;
  }
}

/**
 * Fetch player statistics for a specific match
 */
export async function _fetchMatchPlayerStats(matchId: string) {
  try {
    console.log(`Fetching player statistics for match ${matchId}`);
    
    const playerStats = await fetchFromSportDevs(
      `${WEB_URL}/matches-players-statistics?match_id=eq.${matchId}`,
      getApiKey()
    );
    
    console.log(`Found player statistics for match ${matchId}`);
    return playerStats;
  } catch (error) {
    console.error("Error fetching match player statistics:", error);
    throw error;
  }
}

/**
 * Fetch team statistics for a specific match
 */
export async function _fetchMatchTeamStats(matchId: string) {
  try {
    console.log(`Fetching team statistics for match ${matchId}`);
    
    const teamStats = await fetchFromSportDevs(
      `${WEB_URL}/matches-teams-statistics?match_id=eq.${matchId}`,
      getApiKey()
    );
    
    console.log(`Found team statistics for match ${matchId}`);
    return teamStats;
  } catch (error) {
    console.error("Error fetching match team statistics:", error);
    throw error;
  }
}

// Apply caching to API functions
export const fetchMatchesByTeamAndDate = createCachedFunction(
  _fetchMatchesByTeamAndDate,
  (teamId, startDate, endDate) => `team-matches-${teamId}-${startDate}-${endDate}`,
  CACHE_TTL.TEAM_MATCHES
);

export const fetchMatchLineups = createCachedFunction(
  _fetchMatchLineups,
  (matchId) => `match-lineups-${matchId}`,
  CACHE_TTL.MATCH_LINEUPS
);

export const fetchMatchPlayerStats = createCachedFunction(
  _fetchMatchPlayerStats,
  (matchId) => `match-player-stats-${matchId}`,
  CACHE_TTL.PLAYER_STATS
);

export const fetchMatchTeamStats = createCachedFunction(
  _fetchMatchTeamStats,
  (matchId) => `match-team-stats-${matchId}`,
  CACHE_TTL.MATCH_STATS
);

// Utility function to get matches for the last 6 months
export async function fetchRecentTeamMatches(teamId: string, limit = 10) {
  try {
    // Calculate date range (last 6 months)
    const endDate = new Date().toISOString().split('T')[0]; // Today
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // Fetch matches within date range
    const matches = await fetchMatchesByTeamAndDate(teamId, startDateStr, endDate);
    
    // Limit results if needed
    return matches.slice(0, limit);
  } catch (error) {
    console.error("Error fetching recent team matches:", error);
    return [];
  }
}

// Utility function to get comprehensive match data including lineups and stats
export async function fetchMatchFullDetails(matchId: string) {
  try {
    // Fetch all the details in parallel
    const [lineups, playerStats, teamStats] = await Promise.all([
      fetchMatchLineups(matchId),
      fetchMatchPlayerStats(matchId),
      fetchMatchTeamStats(matchId)
    ]);
    
    return {
      lineups,
      playerStats,
      teamStats
    };
  } catch (error) {
    console.error("Error fetching match full details:", error);
    return {
      lineups: [],
      playerStats: [],
      teamStats: []
    };
  }
}

// Helper function to generate mock data for testing when API fails
export function generateMockMatchData(teamId: string, opponentId: string, matchCount = 5) {
  const matches = [];
  const currentDate = new Date();
  
  // Game-specific stat templates
  const gameStats = {
    csgo: {
      playerStats: ["kills", "deaths", "assists", "headshots", "flash_assists", "adr"],
      teamStats: ["rounds_won", "rounds_lost", "bomb_plants", "bomb_defuses", "first_kills"]
    },
    dota2: {
      playerStats: ["kills", "deaths", "assists", "gpm", "xpm", "last_hits", "denies"],
      teamStats: ["towers_destroyed", "roshans_killed", "team_fights_won", "wards_placed"]
    },
    lol: {
      playerStats: ["kills", "deaths", "assists", "cs", "vision_score", "damage_dealt"],
      teamStats: ["dragons", "barons", "towers", "inhibitors", "heralds"]
    }
  };
  
  // Select random game type for mock data
  const gameTypes = ["csgo", "dota2", "lol"];
  const gameType = gameTypes[Math.floor(Math.random() * gameTypes.length)];
  const statsTemplate = gameStats[gameType as keyof typeof gameStats];
  
  for (let i = 0; i < matchCount; i++) {
    // Create date for match (progressively further in the past)
    const matchDate = new Date(currentDate);
    matchDate.setDate(matchDate.getDate() - (i * 7)); // Weekly matches
    
    // Generate random outcome (team win probability 60%)
    const teamWon = Math.random() < 0.6;
    
    // Create match object
    const match = {
      id: `mock-match-${i}`,
      home_team_id: teamWon ? teamId : opponentId,
      away_team_id: teamWon ? opponentId : teamId,
      home_team_name: teamWon ? "Your Team" : "Opponent " + i,
      away_team_name: teamWon ? "Opponent " + i : "Your Team",
      tournament_name: `Mock Tournament ${Math.floor(i/2) + 1}`,
      start_time: matchDate.toISOString(),
      status: "finished",
      result: teamWon ? "win" : "loss",
      score: teamWon ? "2-1" : "1-2",
      
      // Mock players and stats
      lineups: Array(5).fill(0).map((_, j) => ({
        player_id: `player-${j}`,
        player_name: `Player ${j+1}`,
        team_id: teamId
      })),
      
      playerStats: Array(5).fill(0).map((_, j) => {
        // Create random stats based on the game type
        const stats = {};
        statsTemplate.playerStats.forEach(stat => {
          // @ts-ignore
          stats[stat] = Math.floor(Math.random() * 30) + 5;
        });
        
        return {
          player_id: `player-${j}`,
          player_name: `Player ${j+1}`,
          team_id: teamId,
          ...stats
        };
      }),
      
      teamStats: {
        team_id: teamId,
        team_name: "Your Team",
        ...statsTemplate.teamStats.reduce((acc, stat) => {
          // @ts-ignore
          acc[stat] = Math.floor(Math.random() * 20) + 1;
          return acc;
        }, {})
      }
    };
    
    matches.push(match);
  }
  
  return matches;
}
