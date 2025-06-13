
// FACEIT API integration for amateur CS2 matches
// Note: This requires server-side implementation to keep API key secure

const FACEIT_API_BASE = 'https://open.faceit.com/data/v4';
const FACEIT_API_KEY = 'e40cbee8-785f-47b7-b13c-aa7609896aef';

// Cache for FACEIT API responses (30-60 seconds)
const faceitCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 45000; // 45 seconds

interface FaceitPlayer {
  player_id: string;
  nickname: string;
  avatar?: string;
  skill_level?: number;
  membership?: string;
  elo?: number;
  games?: number;
}

interface FaceitTeam {
  team_id: string;
  name: string;
  avatar?: string;
  roster: FaceitPlayer[];
}

interface FaceitMatch {
  match_id: string;
  game: string;
  region: string;
  competition_name: string;
  competition_type: string;
  organized_by: string;
  status: string;
  started_at: string;
  finished_at?: string;
  teams: {
    faction1: FaceitTeam;
    faction2: FaceitTeam;
  };
  voting?: {
    map?: {
      pick: string[];
    };
  };
  calculate_elo: boolean;
  configured_at: string;
  version: number;
}

interface FaceitMatchListResponse {
  items: FaceitMatch[];
  start: number;
  end: number;
}

// Transform FACEIT match to our MatchInfo format
function transformFaceitMatch(faceitMatch: FaceitMatch): any {
  console.log('🔄 Transforming FACEIT match:', faceitMatch);
  
  return {
    id: `faceit_${faceitMatch.match_id}`,
    teams: [
      {
        name: faceitMatch.teams.faction1.name,
        logo: faceitMatch.teams.faction1.avatar || '/placeholder.svg',
        id: `faceit_team_${faceitMatch.match_id}_1`,
        roster: faceitMatch.teams.faction1.roster || []
      },
      {
        name: faceitMatch.teams.faction2.name,
        logo: faceitMatch.teams.faction2.avatar || '/placeholder.svg',
        id: `faceit_team_${faceitMatch.match_id}_2`,
        roster: faceitMatch.teams.faction2.roster || []
      }
    ],
    startTime: faceitMatch.started_at,  
    tournament: faceitMatch.competition_name || 'FACEIT Match',
    tournament_name: faceitMatch.competition_name,
    season_name: faceitMatch.competition_type,
    class_name: faceitMatch.organized_by,
    esportType: 'csgo', // FACEIT CS2 maps to our csgo type
    bestOf: 1, // Most FACEIT matches are BO1
    source: 'amateur' as const,
    faceitData: {
      region: faceitMatch.region,
      competitionType: faceitMatch.competition_type,
      organizedBy: faceitMatch.organized_by,
      calculateElo: faceitMatch.calculate_elo
    }
  };
}

// Cache helper functions
function getCachedResponse(cacheKey: string) {
  const cached = faceitCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`🎯 Using cached FACEIT response for: ${cacheKey}`);
    return cached.data;
  }
  return null;
}

function setCachedResponse(cacheKey: string, data: any) {
  faceitCache.set(cacheKey, { data, timestamp: Date.now() });
}

// Server-side API call function (would need to be implemented as an API route)
async function callFaceitAPI(endpoint: string): Promise<any> {
  console.log(`🌐 Making FACEIT API call to: ${FACEIT_API_BASE}${endpoint}`);
  
  const response = await fetch(`${FACEIT_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${FACEIT_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    console.error(`❌ FACEIT API error: ${response.status} ${response.statusText}`);
    throw new Error(`FACEIT API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log('✅ FACEIT API response received:', data);
  return data;
}

export async function fetchFaceitLiveMatches(): Promise<any[]> {
  console.log('🔴 Fetching FACEIT live matches...');
  
  const cacheKey = 'faceit_live_matches';
  const cached = getCachedResponse(cacheKey);
  if (cached) return cached;
  
  try {
    const response: FaceitMatchListResponse = await callFaceitAPI('/matches?game=cs2&status=ongoing&limit=10');
    const matches = response.items.map(transformFaceitMatch);
    
    setCachedResponse(cacheKey, matches);
    console.log(`✅ Retrieved ${matches.length} FACEIT live matches`);
    return matches;
  } catch (error) {
    console.error('❌ Error fetching FACEIT live matches:', error);
    return [];
  }
}

export async function fetchFaceitUpcomingMatches(): Promise<any[]> {
  console.log('📅 Fetching FACEIT upcoming matches...');
  
  const cacheKey = 'faceit_upcoming_matches';
  const cached = getCachedResponse(cacheKey);
  if (cached) return cached;
  
  try {
    const response: FaceitMatchListResponse = await callFaceitAPI('/matches?game=cs2&status=upcoming&limit=10');
    const matches = response.items.map(transformFaceitMatch);
    
    setCachedResponse(cacheKey, matches);
    console.log(`✅ Retrieved ${matches.length} FACEIT upcoming matches`);
    return matches;
  } catch (error) {
    console.error('❌ Error fetching FACEIT upcoming matches:', error);
    return [];
  }
}

export async function fetchFaceitMatchDetails(matchId: string): Promise<any | null> {
  console.log(`🔍 Fetching FACEIT match details for: ${matchId}`);
  
  // Remove 'faceit_' prefix if present
  const cleanMatchId = matchId.startsWith('faceit_') ? matchId.replace('faceit_', '') : matchId;
  
  const cacheKey = `faceit_match_${cleanMatchId}`;
  const cached = getCachedResponse(cacheKey);
  if (cached) return cached;
  
  try {
    console.log(`🌐 Calling FACEIT API for match: ${cleanMatchId}`);
    const faceitMatch: FaceitMatch = await callFaceitAPI(`/matches/${cleanMatchId}`);
    console.log('📊 Raw FACEIT match data:', faceitMatch);
    
    const match = transformFaceitMatch(faceitMatch);
    console.log('🔄 Transformed match data:', match);
    
    // Add additional details for match page
    match.faceitMatchDetails = {
      version: faceitMatch.version,
      configuredAt: faceitMatch.configured_at,
      finishedAt: faceitMatch.finished_at,
      voting: faceitMatch.voting
    };
    
    setCachedResponse(cacheKey, match);
    console.log(`✅ Retrieved FACEIT match details for: ${cleanMatchId}`);
    return match;
  } catch (error) {
    console.error(`❌ Error fetching FACEIT match details for ${cleanMatchId}:`, error);
    
    // Return mock data as fallback for development
    console.log('🔄 Returning mock data as fallback');
    return {
      id: `faceit_${cleanMatchId}`,
      teams: [
        {
          name: 'Team Alpha',
          logo: '/placeholder.svg',
          id: 'team_alpha',
          roster: [
            { player_id: '1', nickname: 'player1', avatar: '/placeholder.svg' },
            { player_id: '2', nickname: 'player2', avatar: '/placeholder.svg' }
          ]
        },
        {
          name: 'Team Beta', 
          logo: '/placeholder.svg',
          id: 'team_beta',
          roster: [
            { player_id: '3', nickname: 'player3', avatar: '/placeholder.svg' },
            { player_id: '4', nickname: 'player4', avatar: '/placeholder.svg' }
          ]
        }
      ],
      startTime: new Date().toISOString(),
      tournament: 'FACEIT League',
      bestOf: 1,
      faceitData: {
        region: 'EU',
        competitionType: 'Amateur',
        organizedBy: 'FACEIT',
        calculateElo: true
      }
    };
  }
}
