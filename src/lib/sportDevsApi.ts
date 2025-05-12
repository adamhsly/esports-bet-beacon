import { MatchInfo, TeamInfo } from '@/components/MatchCard';
import { BookmakerOdds, Market } from '@/components/OddsTable';
import { 
  memoryCache, 
  createCachedFunction, 
  getTeamImageUrl, 
  getTournamentImageUrl 
} from '@/utils/cacheUtils';

// API Constants
const API_KEY = "GsZ3ovnDw0umMvL5p7SfPA";
const BASE_URL = "https://api.sportdevs.com";
const WEB_URL = "https://esports.sportdevs.com";

// Cache TTL constants (in seconds)
const CACHE_TTL = {
  LIVE_MATCHES: 30,       // 30 seconds for live matches
  UPCOMING_MATCHES: 300,  // 5 minutes for upcoming matches
  MATCH_DETAILS: 300,     // 5 minutes for match details
  TOURNAMENT: 3600,       // 1 hour for tournament data
  TEAM: 3600,             // 1 hour for team data
  PLAYER: 3600,           // 1 hour for player data
  NEWS: 1800,             // 30 minutes for news
  STANDINGS: 3600,        // 1 hour for standings
  ODDS: 120               // 2 minutes for odds
};

// Types for SportDevs API responses
interface SportDevsMatch {
  id: string;
  status: string;
  start_time: string;
  opponents: SportDevsTeam[];
  tournament: {
    id: string;
    name: string;
    slug: string;
  };
  serie: {
    id: string;
    name: string;
    full_name: string;
  };
  videogame: {
    id: string;
    name: string;
    slug: string;
  };
  format: {
    type: string;
    best_of: number;
  };
}

interface SportDevsTeam {
  id: string;
  name: string;
  image_url: string | null;
  slug: string;
}

interface SportDevsOdds {
  bookmakers: SportDevsBookmaker[];
}

interface SportDevsBookmaker {
  name: string;
  image_url: string | null;
  markets: SportDevsMarket[];
}

interface SportDevsMarket {
  name: string;
  outcomes: SportDevsOutcome[];
}

interface SportDevsOutcome {
  name: string;
  price: number;
}

// Map our esport types to SportDevs API game identifiers
const mapEsportTypeToGameId = (esportType: string): string => {
  const mapping: Record<string, string> = {
    csgo: "csgo",
    dota2: "dota2",
    lol: "lol",
    valorant: "valorant",
    overwatch: "overwatch",
    rocketleague: "rl"
  };
  
  return mapping[esportType] || "csgo"; // Default to CS:GO
};

// Raw API call functions

/**
 * Core fetch function with error handling and logging
 */
async function fetchFromSportDevs(url: string, apiKey: string = API_KEY): Promise<any> {
  console.log(`SportDevs API Request: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'x-api-key': apiKey,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`SportDevs API error ${response.status}:`, errorText);
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  console.log(`SportDevs API Response: ${url} - Received data successfully`);
  return data;
}

/**
 * Raw function to fetch upcoming matches
 */
async function _fetchUpcomingMatches(esportType: string): Promise<MatchInfo[]> {
  try {
    const gameId = mapEsportTypeToGameId(esportType);
    console.log(`SportDevs API: Fetching upcoming matches for ${esportType} (${gameId})`);
    
    const data = await fetchFromSportDevs(`${BASE_URL}/esports/${gameId}/matches/upcoming`);
    console.log(`SportDevs API: Received ${data.length} upcoming matches for ${esportType}`);
    return data.map(match => transformMatchData(match, esportType));
  } catch (error) {
    console.error("Error fetching upcoming matches from SportDevs:", error);
    throw error;
  }
}

/**
 * Raw function to fetch live matches
 */
async function _fetchLiveMatches(esportType: string): Promise<MatchInfo[]> {
  try {
    const gameId = mapEsportTypeToGameId(esportType);
    console.log(`SportDevs API: Fetching live matches for ${esportType} (${gameId})`);
    
    const data = await fetchFromSportDevs(`${BASE_URL}/esports/${gameId}/matches/live`);
    console.log(`SportDevs API: Received ${data.length} live matches for ${esportType}`);
    return data.map(match => transformMatchData(match, esportType));
  } catch (error) {
    console.error("Error fetching live matches from SportDevs:", error);
    throw error;
  }
}

/**
 * Raw function to fetch match by ID
 */
async function _fetchMatchById(matchId: string): Promise<MatchInfo> {
  try {
    console.log(`SportDevs API: Fetching match details for ID: ${matchId}`);
    
    // Use the correct endpoint format for fetching by ID
    const matches = await fetchFromSportDevs(
      `${WEB_URL}/matches?id=eq.${matchId}`
    );
    console.log(`SportDevs API: Received match details for ID: ${matchId}`, matches);
    
    if (!matches || matches.length === 0) {
      throw new Error('Match not found');
    }
    
    const match = matches[0]; // Get the first match from the array
    
    // Determine the esport type from the match data
    let esportType = 'csgo'; // Default
    if (match.class_name) {
      // Map class_name to our esport types
      if (match.class_name === 'CS:GO') esportType = 'csgo';
      else if (match.class_name === 'LoL') esportType = 'lol';
      else if (match.class_name === 'Dota 2') esportType = 'dota2';
      else if (match.class_name === 'Valorant') esportType = 'valorant';
    }
    
    return transformMatchData(match, esportType);
  } catch (error) {
    console.error("Error fetching match by ID from SportDevs:", error);
    throw error;
  }
}

/**
 * Raw function to fetch match games
 */
async function _fetchMatchGames(matchId: string) {
  try {
    console.log(`SportDevs API: Fetching match games for ID: ${matchId}`);
    
    const games = await fetchFromSportDevs(
      `${WEB_URL}/matches-games?match_id=eq.${matchId}`
    );
    console.log(`SportDevs API: Received ${games.length} games for match ID: ${matchId}`);
    return games;
    
  } catch (error) {
    console.error("Error fetching match games:", error);
    throw error;
  }
}

/**
 * Raw function to fetch match statistics
 */
async function _fetchMatchStatistics(matchId: string) {
  try {
    console.log(`SportDevs API: Fetching match statistics for ID: ${matchId}`);
    
    const statistics = await fetchFromSportDevs(
      `${WEB_URL}/matches-games-statistics?match_id=eq.${matchId}`
    );
    console.log(`SportDevs API: Received statistics for match ID: ${matchId}`);
    return statistics;
    
  } catch (error) {
    console.error("Error fetching match statistics:", error);
    throw error;
  }
}

/**
 * Raw function to fetch team by ID
 */
async function _fetchTeamById(teamId: string) {
  try {
    console.log(`SportDevs API: Fetching team details for ID: ${teamId}`);
    
    const teams = await fetchFromSportDevs(
      `${WEB_URL}/teams?id=eq.${teamId}`
    );
    
    if (!teams || teams.length === 0) {
      throw new Error('Team not found');
    }
    
    const team = teams[0];
    
    // Process team to cache image URL
    return processTeamData(team);
    
  } catch (error) {
    console.error("Error fetching team by ID:", error);
    throw error;
  }
}

/**
 * Raw function to fetch players by team ID
 */
async function _fetchPlayersByTeamId(teamId: string) {
  try {
    console.log(`SportDevs API: Fetching players for team ID: ${teamId}`);
    
    const players = await fetchFromSportDevs(
      `${WEB_URL}/players?team_id=eq.${teamId}`
    );
    console.log(`SportDevs API: Received ${players.length} players for team ID: ${teamId}`);
    return players;
    
  } catch (error) {
    console.error("Error fetching players by team ID:", error);
    throw error;
  }
}

/**
 * Raw function to fetch player by ID
 */
async function _fetchPlayerById(playerId: string) {
  try {
    console.log(`SportDevs API: Fetching player details for ID: ${playerId}`);
    
    const players = await fetchFromSportDevs(
      `${WEB_URL}/players?id=eq.${playerId}`
    );
    
    if (!players || players.length === 0) {
      throw new Error('Player not found');
    }
    
    return players[0];
    
  } catch (error) {
    console.error("Error fetching player by ID:", error);
    throw error;
  }
}

/**
 * Raw function to fetch news articles
 */
async function _fetchNews(limit = 10) {
  try {
    console.log(`SportDevs API: Fetching news articles, limit: ${limit}`);
    
    const news = await fetchFromSportDevs(
      `${WEB_URL}/news?limit=${limit}`
    );
    console.log(`SportDevs API: Received ${news.length} news articles`);
    return news;
    
  } catch (error) {
    console.error("Error fetching news:", error);
    throw error;
  }
}

/**
 * Raw function to fetch tournaments
 */
async function _fetchTournaments(limit = 10) {
  try {
    console.log(`SportDevs API: Fetching tournaments, limit: ${limit}`);
    
    const tournaments = await fetchFromSportDevs(
      `${WEB_URL}/tournaments?limit=${limit}`
    );
    console.log(`SportDevs API: Received ${tournaments.length} tournaments`);
    return tournaments;
    
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    throw error;
  }
}

/**
 * Raw function to fetch tournament by ID
 */
async function _fetchTournamentById(tournamentId: string) {
  try {
    console.log(`SportDevs API: Fetching tournament details for ID: ${tournamentId}`);
    
    const tournaments = await fetchFromSportDevs(
      `${WEB_URL}/tournaments?id=eq.${tournamentId}`
    );
    
    if (!tournaments || tournaments.length === 0) {
      throw new Error('Tournament not found');
    }
    
    const tournament = tournaments[0];
    
    // Process tournament to cache image URL
    return processTournamentData(tournament);
    
  } catch (error) {
    console.error("Error fetching tournament by ID:", error);
    throw error;
  }
}

/**
 * Raw function to fetch matches by tournament ID
 */
async function _fetchMatchesByTournamentId(tournamentId: string) {
  try {
    console.log(`SportDevs API: Fetching matches for tournament ID: ${tournamentId}`);
    
    const matches = await fetchFromSportDevs(
      `${WEB_URL}/matches?tournament_id=eq.${tournamentId}`
    );
    console.log(`SportDevs API: Received ${matches.length} matches for tournament ID: ${tournamentId}`);
    
    // Process and return matches in our app's format
    return matches.map((match: any) => {
      // Determine the esport type from the match data
      let esportType = 'csgo'; // Default
      if (match.class_name) {
        if (match.class_name === 'CS:GO') esportType = 'csgo';
        else if (match.class_name === 'LoL') esportType = 'lol';
        else if (match.class_name === 'Dota 2') esportType = 'dota2';
        else if (match.class_name === 'Valorant') esportType = 'valorant';
      }
      
      return transformMatchData(match, esportType);
    });
    
  } catch (error) {
    console.error("Error fetching matches by tournament ID:", error);
    throw error;
  }
}

/**
 * Raw function to fetch league by name
 */
async function _fetchLeagueByName(leagueName: string) {
  try {
    console.log(`SportDevs API: Searching for league with name: ${leagueName}`);
    
    const encodedName = encodeURIComponent(leagueName);
    const leagues = await fetchFromSportDevs(
      `${WEB_URL}/leagues?name=like.*${encodedName}*`
    );
    console.log(`SportDevs API: Found ${leagues.length} leagues matching "${leagueName}"`);
    
    return leagues.length > 0 ? leagues[0] : null;
    
  } catch (error) {
    console.error("Error searching for league by name:", error);
    throw error;
  }
}

/**
 * Raw function to fetch standings by league ID
 */
async function _fetchStandingsByLeagueId(leagueId: string) {
  try {
    console.log(`SportDevs API: Fetching standings for league ID: ${leagueId}`);
    
    const standings = await fetchFromSportDevs(
      `${WEB_URL}/standings?league_id=eq.${leagueId}`
    );
    console.log(`SportDevs API: Received ${standings.length} standings entries for league ID: ${leagueId}`);
    return standings;
    
  } catch (error) {
    console.error("Error fetching standings by league ID:", error);
    throw error;
  }
}

/**
 * Raw function to search for teams by name
 */
async function _searchTeams(query: string, limit = 10) {
  try {
    console.log(`SportDevs API: Searching teams with query: "${query}"`);
    
    const encodedQuery = encodeURIComponent(query);
    const teams = await fetchFromSportDevs(
      `${WEB_URL}/teams?name=like.*${encodedQuery}*&limit=${limit}`
    );
    console.log(`SportDevs API: Found ${teams.length} teams matching "${query}"`);
    return teams;
    
  } catch (error) {
    console.error("Error searching teams:", error);
    throw error;
  }
}

/**
 * Raw function to search for players by name
 */
async function _searchPlayers(query: string, limit = 10) {
  try {
    console.log(`SportDevs API: Searching players with query: "${query}"`);
    
    const encodedQuery = encodeURIComponent(query);
    const players = await fetchFromSportDevs(
      `${WEB_URL}/players?name=like.*${encodedQuery}*&limit=${limit}`
    );
    console.log(`SportDevs API: Found ${players.length} players matching "${query}"`);
    return players;
    
  } catch (error) {
    console.error("Error searching players:", error);
    throw error;
  }
}

/**
 * Raw function to fetch odds for a specific match
 */
async function _fetchMatchOdds(matchId: string): Promise<{
  bookmakerOdds: BookmakerOdds[];
  markets: Market[];
}> {
  try {
    console.log(`SportDevs API: Fetching odds for match ID: ${matchId}`);
    
    const oddsData = await fetchFromSportDevs(
      `${BASE_URL}/esports/matches/${matchId}/odds`
    );
    console.log(`SportDevs API: Received odds for match ID: ${matchId}`);
    
    return transformOddsData(oddsData);
  } catch (error) {
    console.error("Error fetching match odds from SportDevs:", error);
    throw error;
  }
}

// Apply caching to the API call functions
export const fetchUpcomingMatches = createCachedFunction(
  _fetchUpcomingMatches,
  (esportType) => `upcoming-matches-${esportType}`,
  CACHE_TTL.UPCOMING_MATCHES
);

export const fetchLiveMatches = createCachedFunction(
  _fetchLiveMatches,
  (esportType) => `live-matches-${esportType}`,
  CACHE_TTL.LIVE_MATCHES
);

export const fetchMatchById = createCachedFunction(
  _fetchMatchById,
  (matchId) => `match-${matchId}`,
  CACHE_TTL.MATCH_DETAILS
);

export const fetchMatchGames = createCachedFunction(
  _fetchMatchGames,
  (matchId) => `match-games-${matchId}`,
  CACHE_TTL.MATCH_DETAILS
);

export const fetchMatchStatistics = createCachedFunction(
  _fetchMatchStatistics,
  (matchId) => `match-stats-${matchId}`,
  CACHE_TTL.MATCH_DETAILS
);

export const fetchTeamById = createCachedFunction(
  _fetchTeamById,
  (teamId) => `team-${teamId}`,
  CACHE_TTL.TEAM
);

export const fetchPlayersByTeamId = createCachedFunction(
  _fetchPlayersByTeamId,
  (teamId) => `team-players-${teamId}`,
  CACHE_TTL.TEAM
);

export const fetchPlayerById = createCachedFunction(
  _fetchPlayerById,
  (playerId) => `player-${playerId}`,
  CACHE_TTL.PLAYER
);

export const fetchNews = createCachedFunction(
  _fetchNews,
  (limit) => `news-${limit}`,
  CACHE_TTL.NEWS
);

export const fetchTournaments = createCachedFunction(
  _fetchTournaments,
  (limit) => `tournaments-${limit}`,
  CACHE_TTL.TOURNAMENT
);

export const fetchTournamentById = createCachedFunction(
  _fetchTournamentById,
  (tournamentId) => `tournament-${tournamentId}`,
  CACHE_TTL.TOURNAMENT
);

export const fetchMatchesByTournamentId = createCachedFunction(
  _fetchMatchesByTournamentId,
  (tournamentId) => `tournament-matches-${tournamentId}`,
  CACHE_TTL.TOURNAMENT
);

export const fetchLeagueByName = createCachedFunction(
  _fetchLeagueByName,
  (leagueName) => `league-${leagueName}`,
  CACHE_TTL.TOURNAMENT
);

export const fetchStandingsByLeagueId = createCachedFunction(
  _fetchStandingsByLeagueId,
  (leagueId) => `league-standings-${leagueId}`,
  CACHE_TTL.STANDINGS
);

export const searchTeams = createCachedFunction(
  _searchTeams,
  (query, limit) => `teams-search-${query}-${limit}`,
  CACHE_TTL.TEAM
);

export const searchPlayers = createCachedFunction(
  _searchPlayers,
  (query, limit) => `players-search-${query}-${limit}`,
  CACHE_TTL.PLAYER
);

export const fetchMatchOdds = createCachedFunction(
  _fetchMatchOdds,
  (matchId) => `match-odds-${matchId}`,
  CACHE_TTL.ODDS
);

// Helper functions

// Helper function to map game slug to our esport type
function mapGameSlugToEsportType(gameSlug: string): string {
  const mapping: Record<string, string> = {
    "csgo": "csgo",
    "dota2": "dota2",
    "lol": "lol",
    "valorant": "valorant",
    "overwatch": "overwatch",
    "rl": "rocketleague"
  };
  
  return mapping[gameSlug] || "csgo";
}

// Helper function to transform match data to our app's format
function transformMatchData(match: any, esportType: string): MatchInfo {
  // Extract team data, ensuring we have 2 teams
  let teams: TeamInfo[] = [];
  
  // First try to get teams from direct opponents data
  if (match.opponents && match.opponents.length > 0) {
    teams = match.opponents.slice(0, 2).map((team: any) => ({
      name: team.name,
      id: team.id,
      hash_image: team.hash_image,
      logo: team.image_url || '/placeholder.svg'
    }));
  }
  // Then try home_team and away_team
  else if (match.home_team_name && match.away_team_name) {
    teams = [
      { 
        name: match.home_team_name, 
        id: match.home_team_id,
        hash_image: match.home_team_hash_image,
        logo: match.home_team_hash_image ? 
          getTeamImageUrl(match.home_team_id || 'unknown', match.home_team_hash_image) : 
          '/placeholder.svg' 
      },
      { 
        name: match.away_team_name, 
        id: match.away_team_id,
        hash_image: match.away_team_hash_image,
        logo: match.away_team_hash_image ? 
          getTeamImageUrl(match.away_team_id || 'unknown', match.away_team_hash_image) : 
          '/placeholder.svg' 
      }
    ];
  }
  // Then try to extract from name as last resort
  else if (match.name && match.name.includes(' vs ')) {
    const [team1Name, team2Name] = match.name.split(' vs ').map((t: string) => t.trim());
    teams = [
      { name: team1Name, logo: '/placeholder.svg' },
      { name: team2Name, logo: '/placeholder.svg' }
    ];
  }
  
  // If we don't have 2 teams, add placeholders
  while (teams.length < 2) {
    teams.push({
      name: 'TBD',
      logo: '/placeholder.svg'
    });
  }
  
  // Determine the tournament name
  const tournamentName = match.tournament?.name || match.serie?.name || match.tournament_name || match.league_name || "Unknown Tournament";
  
  // Determine the best of format
  let bestOf = match.format?.best_of || 3;
  
  // Log team data to help debug
  console.log(`transformMatchData: Processed teams for match ${match.id}:`, teams);
  
  return {
    id: match.id,
    teams: [teams[0], teams[1]],
    startTime: match.start_time || new Date().toISOString(),
    tournament: tournamentName,
    esportType: esportType,
    bestOf: bestOf
  };
}

// Enhanced function to process tournament data and cache images
export function processTournamentData(tournament: any) {
  if (tournament && tournament.id && tournament.hash_image) {
    // Cache the tournament image URL
    getTournamentImageUrl(tournament.id, tournament.hash_image);
  }
  
  return tournament;
}

// Enhanced function to process team data and cache images
export function processTeamData(team: any) {
  if (team && team.id && team.hash_image) {
    // Cache the team image URL
    getTeamImageUrl(team.id, team.hash_image);
  }
  
  return team;
}

// Helper function to transform odds data to our app's format
function transformOddsData(oddsData: any): {
  bookmakerOdds: BookmakerOdds[];
  markets: Market[];
} {
  // Extract unique market types from all bookmakers
  const marketTypes = new Set<string>();
  const marketOptionsMap: Record<string, string[]> = {};
  
  oddsData.bookmakers.forEach(bookmaker => {
    bookmaker.markets.forEach(market => {
      marketTypes.add(market.name);
      
      // Initialize market options array if needed
      if (!marketOptionsMap[market.name]) {
        marketOptionsMap[market.name] = [];
      }
      
      // Add unique options to the market
      market.outcomes.forEach(outcome => {
        if (!marketOptionsMap[market.name].includes(outcome.name)) {
          marketOptionsMap[market.name].push(outcome.name);
        }
      });
    });
  });
  
  // Transform markets
  const markets: Market[] = Array.from(marketTypes).map(marketName => ({
    name: marketName,
    options: marketOptionsMap[marketName] || []
  }));
  
  // Transform bookmaker odds
  const bookmakerOdds: BookmakerOdds[] = oddsData.bookmakers.map(bookmaker => {
    const odds: Record<string, string> = {};
    
    // Populate odds for each market and outcome
    bookmaker.markets.forEach(market => {
      market.outcomes.forEach(outcome => {
        odds[outcome.name] = outcome.price.toString();
      });
    });
    
    return {
      bookmaker: bookmaker.name,
      logo: bookmaker.image_url || '/placeholder.svg',
      odds,
      link: `https://example.com?bookmaker=${bookmaker.name.toLowerCase()}`, // This would be your affiliate link
    };
  });
  
  return { bookmakerOdds, markets };
}

// Export a function to clear the cache for testing purposes
export function clearCache(): void {
  memoryCache.clear();
}

// Export cache stats function for debugging
export function getCacheStats(): { size: number; keys: string[] } {
  return memoryCache.getStats();
}
