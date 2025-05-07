
import { MatchInfo, TeamInfo } from '@/components/MatchCard';
import { BookmakerOdds, Market } from '@/components/OddsTable';

// API Constants
const API_KEY = "GsZ3ovnDw0umMvL5p7SfPA";
const BASE_URL = "https://api.sportdevs.com";

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

// Fetch all upcoming matches for a specific esport
export async function fetchUpcomingMatches(esportType: string): Promise<MatchInfo[]> {
  try {
    const gameId = mapEsportTypeToGameId(esportType);
    
    console.log(`SportDevs API: Fetching upcoming matches for ${esportType} (${gameId})`);
    
    const response = await fetch(
      `${BASE_URL}/esports/${gameId}/matches/upcoming`,
      {
        headers: {
          'x-api-key': API_KEY,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SportDevs API error ${response.status}:`, errorText);
      throw new Error(`API error: ${response.status}`);
    }
    
    const data: SportDevsMatch[] = await response.json();
    console.log(`SportDevs API: Received ${data.length} upcoming matches for ${esportType}`);
    return data.map(match => transformMatchData(match, esportType));
  } catch (error) {
    console.error("Error fetching upcoming matches from SportDevs:", error);
    throw error;
  }
}

// Fetch live matches for a specific esport
export async function fetchLiveMatches(esportType: string): Promise<MatchInfo[]> {
  try {
    const gameId = mapEsportTypeToGameId(esportType);
    
    console.log(`SportDevs API: Fetching live matches for ${esportType} (${gameId})`);
    
    const response = await fetch(
      `${BASE_URL}/esports/${gameId}/matches/live`,
      {
        headers: {
          'x-api-key': API_KEY,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SportDevs API error ${response.status}:`, errorText);
      throw new Error(`API error: ${response.status}`);
    }
    
    const data: SportDevsMatch[] = await response.json();
    console.log(`SportDevs API: Received ${data.length} live matches for ${esportType}`);
    return data.map(match => transformMatchData(match, esportType));
  } catch (error) {
    console.error("Error fetching live matches from SportDevs:", error);
    throw error;
  }
}

// Fetch match by ID
export async function fetchMatchById(matchId: string): Promise<MatchInfo> {
  try {
    console.log(`SportDevs API: Fetching match details for ID: ${matchId}`);
    
    const response = await fetch(
      `${BASE_URL}/esports/matches/${matchId}`,
      {
        headers: {
          'x-api-key': API_KEY,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SportDevs API error ${response.status}:`, errorText);
      throw new Error(`API error: ${response.status}`);
    }
    
    const match: SportDevsMatch = await response.json();
    console.log(`SportDevs API: Received match details for ID: ${matchId}`);
    
    // Determine the esport type from the match data
    const esportType = mapGameSlugToEsportType(match.videogame.slug);
    return transformMatchData(match, esportType);
  } catch (error) {
    console.error("Error fetching match by ID from SportDevs:", error);
    throw error;
  }
}

// Fetch odds for a specific match
export async function fetchMatchOdds(matchId: string): Promise<{
  bookmakerOdds: BookmakerOdds[];
  markets: Market[];
}> {
  try {
    console.log(`SportDevs API: Fetching odds for match ID: ${matchId}`);
    
    const response = await fetch(
      `${BASE_URL}/esports/matches/${matchId}/odds`,
      {
        headers: {
          'x-api-key': API_KEY,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SportDevs API error ${response.status}:`, errorText);
      throw new Error(`API error: ${response.status}`);
    }
    
    const oddsData: SportDevsOdds = await response.json();
    console.log(`SportDevs API: Received odds for match ID: ${matchId}`);
    
    return transformOddsData(oddsData);
  } catch (error) {
    console.error("Error fetching match odds from SportDevs:", error);
    throw error;
  }
}

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
function transformMatchData(match: SportDevsMatch, esportType: string): MatchInfo {
  // Extract team data, ensuring we have 2 teams
  const teams: TeamInfo[] = match.opponents && match.opponents.length > 0 
    ? match.opponents.slice(0, 2).map(team => ({
        name: team.name,
        logo: team.image_url || '/placeholder.svg'
      }))
    : [];
  
  // If we don't have 2 teams, add placeholders
  while (teams.length < 2) {
    teams.push({
      name: 'TBD',
      logo: '/placeholder.svg'
    });
  }
  
  return {
    id: match.id,
    teams: [teams[0], teams[1]],
    startTime: match.start_time,
    tournament: match.tournament?.name || match.serie?.name || "Unknown Tournament",
    esportType: esportType,
    bestOf: match.format?.best_of || 3
  };
}

// Helper function to transform odds data to our app's format
function transformOddsData(oddsData: SportDevsOdds): {
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
