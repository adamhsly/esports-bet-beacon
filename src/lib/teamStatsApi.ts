import { memoryCache, createCachedFunction } from '@/utils/cacheUtils';
import { fetchFromSportDevs, getApiKey } from './sportDevsApi';
import { clamp, randomInRange, randomNormal } from './utils';

// Cache TTL for different types of data (in seconds)
const CACHE_TTL = {
  TEAM_MATCHES: 300,      // 5 minutes
  MATCH_LINEUPS: 600,     // 10 minutes
  PLAYER_STATS: 600,      // 10 minutes
  MATCH_STATS: 600        // 10 minutes
};

// Base URL for the SportDevs API
const WEB_URL = "https://esports.sportdevs.com";

// Define interfaces for our data structures
interface PlayerStats {
  player_id: string;
  player_name: string;
  role: string;
  team_id: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  [key: string]: any; // Allow for other game-specific stats
}

interface TeamStats {
  team_id: string;
  team_name: string;
  match_id: string;
  result: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  [key: string]: any; // Allow for other game-specific stats
}

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
    console.log(`Fetching recent matches for team ID: ${teamId}`);
    
    // Validate team ID - convert to string to ensure consistent handling
    const teamIdStr = String(teamId);
    
    if (!teamIdStr || teamIdStr === 'team1' || teamIdStr === 'team2' || teamIdStr.startsWith('unknown')) {
      console.log(`Invalid team ID ${teamIdStr} - using mock data instead`);
      throw new Error('Invalid team ID');
    }

    // Calculate date range (last 6 months)
    const endDate = new Date().toISOString().split('T')[0]; // Today
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // Fetch matches within date range
    const matches = await fetchMatchesByTeamAndDate(teamIdStr, startDateStr, endDate);
    
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
    console.log(`Fetching full details for match ID: ${matchId}`);
    
    // Validate match ID
    if (!matchId || matchId.startsWith('mock-match')) {
      console.log(`Invalid match ID ${matchId} - using mock data instead`);
      return null;
    }

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
    return null;
  }
}

// Define game-specific stat templates for mock data
const gameStatTemplates = {
  csgo: {
    playerStats: [
      { name: "kills", min: 5, max: 30, mean: 18, stdDev: 5 },
      { name: "deaths", min: 5, max: 25, mean: 15, stdDev: 4 },
      { name: "assists", min: 2, max: 15, mean: 7, stdDev: 3 },
      { name: "adr", min: 50, max: 120, mean: 80, stdDev: 15 },
      { name: "flash_assists", min: 0, max: 10, mean: 4, stdDev: 2 },
      { name: "headshots", min: 3, max: 15, mean: 9, stdDev: 3 },
      { name: "first_kills", min: 0, max: 5, mean: 2, stdDev: 1 },
      { name: "clutches", min: 0, max: 3, mean: 1, stdDev: 0.8 }
    ],
    teamStats: [
      { name: "rounds_won", min: 5, max: 16, mean: 11, stdDev: 3 },
      { name: "rounds_lost", min: 5, max: 16, mean: 11, stdDev: 3 },
      { name: "bomb_plants", min: 3, max: 12, mean: 7, stdDev: 2 },
      { name: "bomb_defuses", min: 0, max: 5, mean: 2, stdDev: 1 },
      { name: "first_kills", min: 5, max: 15, mean: 9, stdDev: 2 },
      { name: "team_kills", min: 0, max: 3, mean: 1, stdDev: 0.5 },
      { name: "clutch_rounds", min: 0, max: 5, mean: 2, stdDev: 1 },
      { name: "eco_rounds_won", min: 0, max: 3, mean: 1, stdDev: 0.7 }
    ]
  },
  dota2: {
    playerStats: [
      { name: "kills", min: 2, max: 15, mean: 7, stdDev: 3 },
      { name: "deaths", min: 1, max: 12, mean: 6, stdDev: 2 },
      { name: "assists", min: 5, max: 25, mean: 12, stdDev: 5 },
      { name: "gpm", min: 300, max: 800, mean: 500, stdDev: 100 },
      { name: "xpm", min: 300, max: 700, mean: 500, stdDev: 100 },
      { name: "last_hits", min: 50, max: 400, mean: 200, stdDev: 80 },
      { name: "denies", min: 5, max: 30, mean: 15, stdDev: 5 },
      { name: "hero_damage", min: 5000, max: 40000, mean: 18000, stdDev: 7000 }
    ],
    teamStats: [
      { name: "towers_destroyed", min: 1, max: 11, mean: 6, stdDev: 2 },
      { name: "roshans_killed", min: 0, max: 3, mean: 1, stdDev: 0.8 },
      { name: "team_fights_won", min: 2, max: 15, mean: 7, stdDev: 3 },
      { name: "wards_placed", min: 10, max: 50, mean: 25, stdDev: 8 },
      { name: "sentries_placed", min: 10, max: 40, mean: 20, stdDev: 7 },
      { name: "camps_stacked", min: 2, max: 20, mean: 8, stdDev: 4 },
      { name: "runes_collected", min: 5, max: 25, mean: 15, stdDev: 5 },
      { name: "total_gold", min: 15000, max: 40000, mean: 25000, stdDev: 5000 }
    ]
  },
  lol: {
    playerStats: [
      { name: "kills", min: 1, max: 15, mean: 6, stdDev: 3 },
      { name: "deaths", min: 0, max: 10, mean: 4, stdDev: 2 },
      { name: "assists", min: 2, max: 20, mean: 10, stdDev: 4 },
      { name: "cs", min: 150, max: 400, mean: 250, stdDev: 50 },
      { name: "vision_score", min: 20, max: 100, mean: 50, stdDev: 15 },
      { name: "damage_dealt", min: 10000, max: 50000, mean: 25000, stdDev: 8000 },
      { name: "gold_earned", min: 8000, max: 20000, mean: 13000, stdDev: 3000 },
      { name: "wards_placed", min: 5, max: 30, mean: 15, stdDev: 5 }
    ],
    teamStats: [
      { name: "dragons", min: 0, max: 4, mean: 2, stdDev: 1 },
      { name: "barons", min: 0, max: 2, mean: 1, stdDev: 0.5 },
      { name: "towers", min: 1, max: 11, mean: 6, stdDev: 2 },
      { name: "inhibitors", min: 0, max: 3, mean: 1, stdDev: 0.8 },
      { name: "heralds", min: 0, max: 2, mean: 1, stdDev: 0.5 },
      { name: "gold_difference", min: -10000, max: 10000, mean: 0, stdDev: 4000 },
      { name: "first_blood", min: 0, max: 1, mean: 0.5, stdDev: 0.5 },
      { name: "team_kills", min: 5, max: 40, mean: 20, stdDev: 7 }
    ]
  }
};

// Set fixed player names for consistent trending analysis
const consistentPlayerNames = {
  csgo: ["AWPer", "Rifler", "Entry", "Support", "IGL"],
  dota2: ["Carry", "Midlaner", "Offlaner", "Soft Support", "Hard Support"],
  lol: ["Top", "Jungle", "Mid", "ADC", "Support"]
};

// Helper function to generate mock data for testing when API fails
export function generateMockMatchData(teamId: string | number, opponentId: string | number, matchCount = 5) {
  // Convert IDs to strings to ensure consistent handling
  const teamIdStr = String(teamId);
  const opponentIdStr = String(opponentId);
  
  console.log(`Generating mock match data for team ${teamIdStr} vs ${opponentIdStr}, count: ${matchCount}`);
  
  const matches = [];
  const currentDate = new Date();
  
  // Select game type based on team ID to ensure consistency
  const gameTypes = ["csgo", "dota2", "lol"];
  
  // Use a simple hash function to derive a consistent game type from the team ID string
  let teamIdSum = 0;
  for (let i = 0; i < teamIdStr.length; i++) {
    teamIdSum += teamIdStr.charCodeAt(i);
  }
  
  const gameType = gameTypes[teamIdSum % gameTypes.length];
  console.log(`Selected game type for mock data: ${gameType}`);
  
  // Get the appropriate stat templates
  const statTemplate = gameStatTemplates[gameType as keyof typeof gameStatTemplates];
  const playerRoles = consistentPlayerNames[gameType as keyof typeof consistentPlayerNames];
  
  // Create consistent performance profiles for players (some better, some worse)
  const playerPerformanceMultipliers = [1.2, 1.1, 1.0, 0.9, 0.8];
  
  // Generate team performance pattern (gradually improving, declining, or mixed)
  // This makes trends more visible and interesting
  const teamTrend = Math.random() > 0.5 ? 0.1 : -0.1; // Improving or declining
  
  for (let i = 0; i < matchCount; i++) {
    // Create date for match (progressively further in the past)
    const matchDate = new Date(currentDate);
    matchDate.setDate(matchDate.getDate() - (i * 3 + Math.floor(Math.random() * 3))); // Matches every 3-5 days
    
    // Generate match outcome with slight bias toward recent trend
    const trendFactor = teamTrend * i * 0.15; // Small cumulative effect
    const teamWon = Math.random() < (0.5 + trendFactor);
    
    // Generate more realistic score based on game type
    let score;
    if (gameType === "csgo") {
      const teamScore = teamWon ? randomInRange(13, 16) : randomInRange(3, 14);
      const opponentScore = teamWon ? randomInRange(3, 14) : randomInRange(13, 16);
      score = `${teamScore}-${opponentScore}`;
    } else {
      // Dota2/LoL typically best of 3
      score = teamWon ? "2-1" : "1-2";
      if (Math.random() > 0.7) {
        score = teamWon ? "2-0" : "0-2"; // Sometimes clean sweeps
      }
    }
    
    // Create detailed player stats with consistent player names and roles
    const playerStats: PlayerStats[] = playerRoles.map((role, j) => {
      const performanceMultiplier = playerPerformanceMultipliers[j];
      const playerName = `${role} Player`;
      
      // Create stats object based on the game type
      const stats: Record<string, any> = {};
      
      // Apply team trend to individual performances (gradually getting better/worse)
      const matchTrendFactor = 1 + (teamTrend * i * 0.1);
      
      // Generate values for each stat
      statTemplate.playerStats.forEach(stat => {
        // Calculate adjusted mean based on player performance profile and match trend
        const adjustedMean = stat.mean * performanceMultiplier * matchTrendFactor;
        
        // Generate random value following normal distribution
        let value = randomNormal(adjustedMean, stat.stdDev);
        
        // Clamp to min/max range
        value = clamp(value, stat.min, stat.max);
        
        // Round to integer for most stats
        if (stat.name !== "adr" && !stat.name.includes("pm")) {
          value = Math.round(value);
        } else {
          // Round to 1 decimal for values like ADR, GPM, etc.
          value = Math.round(value * 10) / 10;
        }
        
        // Add the stat to the stats object
        stats[stat.name] = value;
      });
      
      return {
        player_id: `player-${teamIdStr}-${j}`,
        player_name: playerName,
        role: role,
        team_id: teamIdStr,
        ...stats
      };
    });
    
    // Generate team stats
    const teamStats: TeamStats = {
      team_id: teamIdStr,
      team_name: "Your Team",
      match_id: `mock-match-${i}`,
      result: teamWon ? "win" : "loss",
    };
    
    // Apply team trend to stats
    const matchTrendFactor = 1 + (teamTrend * i * 0.1);
    
    // Add specific stats based on game type
    statTemplate.teamStats.forEach(stat => {
      // Calculate adjusted mean based on match trend
      const adjustedMean = stat.mean * matchTrendFactor;
      
      // Generate random value following normal distribution
      let value = randomNormal(adjustedMean, stat.stdDev);
      
      // Clamp to min/max range
      value = clamp(value, stat.min, stat.max);
      
      // Round to integer for most stats
      if (!stat.name.includes("difference")) {
        value = Math.round(value);
      } else {
        // Round to nearest 100 for differences
        value = Math.round(value / 100) * 100;
      }
      
      // Add the stat to the teamStats object
      (teamStats as any)[stat.name] = value;
    });
    
    // Calculate kills, deaths, assists aggregates from player stats
    let totalKills = 0, totalDeaths = 0, totalAssists = 0;
    playerStats.forEach(player => {
      totalKills += player.kills || 0;
      totalDeaths += player.deaths || 0;
      totalAssists += player.assists || 0;
    });
    
    // Add these to team stats
    teamStats.kills = totalKills;
    teamStats.deaths = totalDeaths;
    teamStats.assists = totalAssists;
    
    // Create match object
    const match = {
      id: `mock-match-${i}`,
      home_team_id: teamWon ? teamIdStr : opponentIdStr,
      away_team_id: teamWon ? opponentIdStr : teamIdStr,
      home_team_name: teamWon ? "Your Team" : `Opponent ${i}`,
      away_team_name: teamWon ? `Opponent ${i}` : "Your Team",
      tournament_name: `Mock Tournament ${Math.floor(i/3) + 1}`,
      start_time: matchDate.toISOString(),
      status: "finished",
      result: teamWon ? "win" : "loss",
      score: score,
      
      // Include the generated data
      lineups: playerRoles.map((role, j) => ({
        player_id: `player-${teamIdStr}-${j}`,
        player_name: `${role} Player`,
        team_id: teamIdStr,
        role: role
      })),
      
      playerStats: playerStats,
      teamStats: teamStats
    };
    
    matches.push(match);
  }
  
  console.log(`Generated ${matches.length} mock matches with ${gameType} data`);
  console.log("Sample player stats:", matches[0].playerStats[0]);
  console.log("Sample team stats:", matches[0].teamStats);
  
  return matches;
}
