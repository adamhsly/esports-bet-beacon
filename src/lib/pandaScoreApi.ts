
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
    
    const response = await fetch(
      `${BASE_URL}/matches/upcoming?videogame=${videogameSlug}&sort=begin_at&page=1&per_page=10&token=${apiKey}`
    );
    
    if (!response.ok) {
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
    
    const response = await fetch(
      `${BASE_URL}/matches/running?videogame=${videogameSlug}&token=${apiKey}`
    );
    
    if (!response.ok) {
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
    const id = parseInt(matchId);
    
    if (isNaN(id)) {
      throw new Error("Invalid match ID");
    }
    
    const response = await fetch(
      `${BASE_URL}/matches/${id}?token=${apiKey}`
    );
    
    if (!response.ok) {
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
