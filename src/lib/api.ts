
import { MatchInfo, TeamInfo } from '@/components/MatchCard';
import { BookmakerOdds, Market } from '@/components/OddsTable';

// Define types for API responses
interface ApiMatch {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: ApiBookmaker[];
}

interface ApiBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: ApiMarket[];
}

interface ApiMarket {
  key: string;
  outcomes: ApiOutcome[];
}

interface ApiOutcome {
  name: string;
  price: number;
}

// Get API key from local storage (set by ApiKeyProvider)
const getApiKey = (): string => {
  return localStorage.getItem('esports_odds_api_key') || "768be4d279716fba14e362e3e9ce039c";
};

const BASE_URL = "https://api.the-odds-api.com/v4";

// Fetch all matches for a specific esport
export async function fetchMatchesByEsport(esportType: string): Promise<MatchInfo[]> {
  try {
    const apiKey = getApiKey();
    
    // Map our esport types to API sport keys
    const sportKey = mapEsportTypeToApiKey(esportType);
    
    console.log(`Fetching matches for esport ${esportType} with sport key: ${sportKey}`);
    
    // The Odds API requires apiKey as a query parameter
    const response = await fetch(
      `${BASE_URL}/sports/${sportKey}/odds?apiKey=${apiKey}&regions=us,eu&markets=h2h,spreads,totals`
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`The Odds API error ${response.status}:`, errorText);
      
      // According to logs, we need to check for specific errors and handle them
      if (response.status === 404 && errorText.includes("Unknown sport")) {
        console.log(`Sport key ${sportKey} not found in The Odds API, using mock data`);
        throw new Error(`Unknown sport: ${sportKey}`);
      }
      
      throw new Error(`API error: ${response.status}`);
    }
    
    const data: ApiMatch[] = await response.json();
    console.log(`Received ${data.length} matches from The Odds API`);
    
    // Transform API data to our app's format
    return data.map(match => transformMatchData(match, esportType));
  } catch (error) {
    console.error("Error fetching matches from The Odds API:", error);
    throw error; // Let the component handle the fallback
  }
}

// Fetch details for a specific match
export async function fetchMatchById(matchId: string): Promise<MatchInfo | undefined> {
  try {
    const apiKey = getApiKey();
    
    console.log(`Attempting to find match with ID ${matchId} in The Odds API`);
    
    // The Odds API doesn't have a direct endpoint for a single match by ID
    // So we need to fetch all matches from all esport types and filter by ID
    const esportTypes = ['csgo', 'lol', 'dota2', 'valorant', 'overwatch', 'rocketleague'];
    
    for (const esportType of esportTypes) {
      try {
        const sportKey = mapEsportTypeToApiKey(esportType);
        
        console.log(`Looking for match ${matchId} in sport ${sportKey}`);
        
        const response = await fetch(
          `${BASE_URL}/sports/${sportKey}/odds?apiKey=${apiKey}&regions=us,eu&markets=h2h,spreads,totals`
        );
        
        if (!response.ok) {
          console.error(`API error for ${sportKey}: ${response.status}`);
          continue; // Try next sport
        }
        
        const data: ApiMatch[] = await response.json();
        console.log(`Found ${data.length} matches for ${sportKey}`);
        
        const match = data.find(m => m.id === matchId);
        
        if (match) {
          console.log(`Found match with ID ${matchId} in ${sportKey}`);
          return transformMatchData(match, esportType);
        }
      } catch (err) {
        console.error(`Error searching in ${esportType}:`, err);
        continue; // Try next sport
      }
    }
    
    console.error(`Match with ID ${matchId} not found in any sport from The Odds API`);
    throw new Error("Match not found in The Odds API");
  } catch (error) {
    console.error("Error fetching match details from The Odds API:", error);
    throw error;
  }
}

// Fetch odds for a specific match
export async function fetchMatchOdds(matchId: string): Promise<{
  bookmakerOdds: BookmakerOdds[];
  markets: Market[];
}> {
  try {
    const apiKey = getApiKey();
    
    console.log(`Fetching odds data for match ID: ${matchId}`);
    
    // Try all esport types to find the match
    const esportTypes = ['csgo', 'lol', 'dota2', 'valorant', 'overwatch', 'rocketleague'];
    
    for (const esportType of esportTypes) {
      try {
        const sportKey = mapEsportTypeToApiKey(esportType);
        
        console.log(`Checking for match odds in ${sportKey}`);
        
        const response = await fetch(
          `${BASE_URL}/sports/${sportKey}/odds?apiKey=${apiKey}&regions=us,eu&markets=h2h,spreads,totals`
        );
        
        if (!response.ok) {
          console.error(`API error for ${sportKey}: ${response.status}`);
          continue; // Try next sport
        }
        
        const data: ApiMatch[] = await response.json();
        const match = data.find(m => m.id === matchId);
        
        if (match) {
          console.log(`Found match odds for ID ${matchId} in ${sportKey}`);
          return transformMatchOdds(match);
        }
      } catch (err) {
        console.error(`Error searching odds in ${esportType}:`, err);
        continue; // Try next sport
      }
    }
    
    console.error(`No odds found for match ID ${matchId} in any sport`);
    throw new Error("Match odds not found");
  } catch (error) {
    console.error("Error fetching match odds:", error);
    throw error;
  }
}

// Helper function to map our esport types to API sport keys for The Odds API
function mapEsportTypeToApiKey(esportType: string): string {
  // Based on error logs - using the updated sport keys
  const mapping: Record<string, string> = {
    csgo: "esports_counter_strike",
    dota2: "esports_dota_2",
    lol: "esports_lol", 
    valorant: "esports_valorant",
    overwatch: "esports_overwatch_2",
    rocketleague: "esports_rocket_league"
  };
  
  return mapping[esportType] || "esports_counter_strike"; // Default to CS
}

// Helper function to transform API match data to our app format
function transformMatchData(apiMatch: ApiMatch, esportType: string): MatchInfo {
  return {
    id: apiMatch.id,
    teams: [
      { 
        name: apiMatch.home_team, 
        logo: `/placeholder.svg` // In a real implementation, you'd have team logos
      },
      { 
        name: apiMatch.away_team, 
        logo: `/placeholder.svg`
      }
    ],
    startTime: apiMatch.commence_time,
    tournament: apiMatch.sport_title,
    esportType: esportType,
    bestOf: 3 // This info might not be available from the API and would need another source
  };
}

// Helper function to transform API odds data to our app format
function transformMatchOdds(apiMatch: ApiMatch): {
  bookmakerOdds: BookmakerOdds[];
  markets: Market[];
} {
  // Get unique market types
  const marketTypes = new Set<string>();
  apiMatch.bookmakers.forEach(bookmaker => {
    bookmaker.markets.forEach(market => {
      marketTypes.add(market.key);
    });
  });
  
  // Transform markets
  const markets: Market[] = Array.from(marketTypes).map(marketKey => {
    const options: string[] = [];
    
    // Collect all possible outcomes from all bookmakers
    apiMatch.bookmakers.forEach(bookmaker => {
      const market = bookmaker.markets.find(m => m.key === marketKey);
      if (market) {
        market.outcomes.forEach(outcome => {
          if (!options.includes(outcome.name)) {
            options.push(outcome.name);
          }
        });
      }
    });
    
    return {
      name: formatMarketName(marketKey),
      options
    };
  });
  
  // Transform bookmaker odds
  const bookmakerOdds: BookmakerOdds[] = apiMatch.bookmakers.map(bookmaker => {
    const odds: Record<string, string> = {};
    
    // Populate odds for each market and outcome
    bookmaker.markets.forEach(market => {
      market.outcomes.forEach(outcome => {
        odds[outcome.name] = outcome.price.toString();
      });
    });
    
    return {
      bookmaker: bookmaker.title,
      logo: `/placeholder.svg`, // In a real implementation, you'd have bookmaker logos
      odds,
      link: `https://example.com?bookmaker=${bookmaker.key}`, // This would be your affiliate link
    };
  });
  
  return { bookmakerOdds, markets };
}

// Helper function to format market names
function formatMarketName(apiMarketKey: string): string {
  const marketNames: Record<string, string> = {
    h2h: "Match Winner",
    spreads: "Map Handicap",
    totals: "Total Maps"
  };
  
  return marketNames[apiMarketKey] || apiMarketKey;
}
