
import { MatchInfo, TeamInfo } from '@/components/MatchCard';

// Define types for PandaScore API responses
interface PandaScoreMatch {
  id: number;
  begin_at: string;
  end_at: string | null;
  modified_at: string;
  name: string;
  match_type: string;
  status: string;
  number_of_games: number;
  opponents: {
    opponent: PandaScoreTeam;
    type: string;
  }[];
  league: {
    id: number;
    name: string;
    slug: string;
    image_url: string | null;
  };
  serie: {
    id: number;
    name: string;
    full_name: string;
  };
  tournament: {
    id: number;
    name: string;
    slug: string;
  };
  videogame: {
    id: number;
    name: string;
    slug: string;
  };
}

interface PandaScoreTeam {
  id: number;
  name: string;
  acronym: string | null;
  image_url: string | null;
  slug: string;
}

// Get API key from local storage
const getApiKey = (): string => {
  return localStorage.getItem('esports_pandascore_api_key') || "kYJELuXydUWktzw8lPtGygWUKp7K6nB8pM2k8-sITtzcqLG4OHk";
};

const BASE_URL = "https://api.pandascore.co";

// Map our esport types to PandaScore API endpoint paths
const mapEsportTypeToEndpoint = (esportType: string): string => {
  const mapping: Record<string, string> = {
    csgo: "csgo",
    dota2: "dota2",
    lol: "lol",
    valorant: "valorant",
    overwatch: "ow",
    rocketleague: "rl"
  };
  
  return mapping[esportType] || "csgo"; // Default to CS:GO
};

// Fetch upcoming matches for a specific esport
export async function fetchUpcomingMatches(esportType: string): Promise<MatchInfo[]> {
  try {
    const apiKey = getApiKey();
    const endpoint = mapEsportTypeToEndpoint(esportType);
    
    console.log(`Fetching upcoming matches for ${esportType} using endpoint: ${endpoint}/matches/upcoming`);
    
    // Using Authorization header instead of query parameter for better security
    const response = await fetch(
      `${BASE_URL}/${endpoint}/matches/upcoming?sort=begin_at&page=1&per_page=10`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`PandaScore API error ${response.status}:`, errorText);
      throw new Error(`API error: ${response.status}`);
    }
    
    const data: PandaScoreMatch[] = await response.json();
    console.log(`Received ${data.length} upcoming matches for ${esportType}`);
    return data.map(match => transformMatchData(match, esportType));
  } catch (error) {
    console.error("Error fetching upcoming matches:", error);
    throw error; // Let the component handle the fallback
  }
}

// Fetch live matches for a specific esport
export async function fetchLiveMatches(esportType: string): Promise<MatchInfo[]> {
  try {
    const apiKey = getApiKey();
    const endpoint = mapEsportTypeToEndpoint(esportType);
    
    console.log(`Fetching live matches for ${esportType} using endpoint: ${endpoint}/matches/running`);
    
    // Using Authorization header instead of query parameter
    const response = await fetch(
      `${BASE_URL}/${endpoint}/matches/running`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`PandaScore API error ${response.status}:`, errorText);
      throw new Error(`API error: ${response.status}`);
    }
    
    const data: PandaScoreMatch[] = await response.json();
    console.log(`Received ${data.length} live matches for ${esportType}`);
    return data.map(match => transformMatchData(match, esportType));
  } catch (error) {
    console.error("Error fetching live matches:", error);
    throw error;
  }
}

// Fetch match by ID
export async function fetchMatchById(matchId: string): Promise<MatchInfo | undefined> {
  try {
    const apiKey = getApiKey();
    
    // Handle non-numeric IDs (from The Odds API)
    if (isNaN(parseInt(matchId))) {
      console.log(`Match ID ${matchId} is not a numeric PandaScore ID, trying to find in different esports...`);
      
      // Try to fetch from all possible esport endpoints
      const esportTypes = ['csgo', 'lol', 'dota2', 'valorant', 'overwatch', 'rocketleague'];
      
      for (const esportType of esportTypes) {
        try {
          // Try upcoming matches
          console.log(`Checking ${esportType} upcoming matches for ID: ${matchId}`);
          const upcomingMatches = await fetchUpcomingMatches(esportType);
          const match = upcomingMatches.find(m => m.id === matchId);
          if (match) {
            console.log(`Found match in ${esportType} upcoming matches`);
            return match;
          }
          
          // Try live matches
          console.log(`Checking ${esportType} live matches for ID: ${matchId}`);
          const liveMatches = await fetchLiveMatches(esportType);
          const liveMatch = liveMatches.find(m => m.id === matchId);
          if (liveMatch) {
            console.log(`Found match in ${esportType} live matches`);
            return liveMatch;
          }
        } catch (err) {
          console.error(`Error searching in ${esportType}:`, err);
          continue; // Try next esport
        }
      }
      
      console.error(`Match with ID ${matchId} not found in any esport type`);
      throw new Error("Match not found in PandaScore");
    }
    
    // For numeric IDs, try the direct endpoint
    const numericId = parseInt(matchId);
    console.log(`Fetching PandaScore match with numeric ID: ${numericId}`);
    
    const response = await fetch(
      `${BASE_URL}/matches/${numericId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`PandaScore API error ${response.status}:`, errorText);
      throw new Error(`API error: ${response.status}`);
    }
    
    const match: PandaScoreMatch = await response.json();
    const esportType = mapPandaScoreGameToEsportType(match.videogame.slug);
    return transformMatchData(match, esportType);
  } catch (error) {
    console.error("Error fetching match by ID:", error);
    throw error;
  }
}

// Helper function to map PandaScore game slug to our esport type
function mapPandaScoreGameToEsportType(gameSlug: string): string {
  const mapping: Record<string, string> = {
    "cs-go": "csgo",
    "dota-2": "dota2",
    "league-of-legends": "lol",
    "valorant": "valorant",
    "overwatch-2": "overwatch",
    "rocket-league": "rocketleague"
  };
  
  return mapping[gameSlug] || "csgo";
}

// Helper function to transform PandaScore match data to our app format
function transformMatchData(match: PandaScoreMatch, esportType: string): MatchInfo {
  const teams: TeamInfo[] = match.opponents && match.opponents.length > 0 
    ? match.opponents.slice(0, 2).map(opponent => ({
        name: opponent.opponent.name,
        logo: opponent.opponent.image_url || '/placeholder.svg'
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
    id: match.id.toString(),
    teams: [teams[0], teams[1]],
    startTime: match.begin_at,
    tournament: match.tournament?.name || match.league?.name || "Unknown Tournament",
    esportType: esportType,
    bestOf: match.number_of_games || 3
  };
}
