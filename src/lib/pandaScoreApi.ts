
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

// Map our esport types to PandaScore videogame slugs
const mapEsportTypeToSlug = (esportType: string): string => {
  const mapping: Record<string, string> = {
    csgo: "cs-go",
    dota2: "dota-2",
    lol: "league-of-legends",
    valorant: "valorant",
    overwatch: "overwatch-2",
    rocketleague: "rocket-league"
  };
  
  return mapping[esportType] || "cs-go"; // Default to CS:GO
};

// Fetch upcoming matches for a specific esport
export async function fetchUpcomingMatches(esportType: string): Promise<MatchInfo[]> {
  try {
    const apiKey = getApiKey();
    const videogameSlug = mapEsportTypeToSlug(esportType);
    
    // Using Authorization header instead of query parameter for better security
    const response = await fetch(
      `${BASE_URL}/matches/upcoming?videogame=${videogameSlug}&sort=begin_at&page=1&per_page=10`,
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
    const videogameSlug = mapEsportTypeToSlug(esportType);
    
    // Using Authorization header instead of query parameter
    const response = await fetch(
      `${BASE_URL}/matches/running?videogame=${videogameSlug}`,
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
    
    // FIX: Handle non-numeric IDs gracefully
    // PandaScore expects numeric IDs, but our mock data may have alphanumeric IDs
    const id = parseInt(matchId);
    
    // If the ID isn't a valid number, we'll try a different approach
    if (isNaN(id)) {
      console.log(`Match ID ${matchId} is not a valid PandaScore ID (not numeric)`);
      
      // Try to fetch all matches from all esport types and look for the match
      const esportTypes = ['csgo', 'lol', 'dota2', 'valorant', 'overwatch', 'rocketleague'];
      
      for (const esportType of esportTypes) {
        try {
          // Try upcoming matches
          const upcomingMatches = await fetchUpcomingMatches(esportType);
          const match = upcomingMatches.find(m => m.id === matchId);
          if (match) return match;
          
          // Try live matches
          const liveMatches = await fetchLiveMatches(esportType);
          const liveMatch = liveMatches.find(m => m.id === matchId);
          if (liveMatch) return liveMatch;
        } catch (err) {
          continue; // Try next esport
        }
      }
      
      // If we still can't find the match, throw an error
      throw new Error("Match not found");
    }
    
    // If we have a numeric ID, use the direct API endpoint
    console.log(`Fetching PandaScore match with numeric ID: ${id}`);
    
    // Using Authorization header instead of query parameter
    const response = await fetch(
      `${BASE_URL}/matches/${id}`,
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
  const teams: TeamInfo[] = match.opponents.slice(0, 2).map(opponent => ({
    name: opponent.opponent.name,
    logo: opponent.opponent.image_url || '/placeholder.svg'
  }));
  
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
