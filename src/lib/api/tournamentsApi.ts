
import { API_KEY, WEB_URL } from './apiConfig';

// Fetch tournaments
export async function fetchTournaments(limit = 10) {
  try {
    console.log(`SportDevs API: Fetching tournaments, limit: ${limit}`);
    
    const response = await fetch(
      `${WEB_URL}/tournaments?limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const tournaments = await response.json();
    console.log(`SportDevs API: Received ${tournaments.length} tournaments`);
    return tournaments;
    
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    throw error;
  }
}

// Fetch tournament by ID
export async function fetchTournamentById(tournamentId: string) {
  try {
    console.log(`SportDevs API: Fetching tournament details for ID: ${tournamentId}`);
    
    const response = await fetch(
      `${WEB_URL}/tournaments?id=eq.${tournamentId}`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const tournaments = await response.json();
    
    if (!tournaments || tournaments.length === 0) {
      throw new Error('Tournament not found');
    }
    
    return tournaments[0];
    
  } catch (error) {
    console.error("Error fetching tournament by ID:", error);
    throw error;
  }
}

// Fetch league information by name search
export async function fetchLeagueByName(leagueName: string) {
  try {
    console.log(`SportDevs API: Searching for league with name: ${leagueName}`);
    
    const encodedName = encodeURIComponent(leagueName);
    const response = await fetch(
      `${WEB_URL}/leagues?name=like.*${encodedName}*`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const leagues = await response.json();
    console.log(`SportDevs API: Found ${leagues.length} leagues matching "${leagueName}"`);
    
    return leagues.length > 0 ? leagues[0] : null;
    
  } catch (error) {
    console.error("Error searching for league by name:", error);
    throw error;
  }
}

// Fetch standings by league ID
export async function fetchStandingsByLeagueId(leagueId: string) {
  try {
    console.log(`SportDevs API: Fetching standings for league ID: ${leagueId}`);
    
    const response = await fetch(
      `${WEB_URL}/standings?league_id=eq.${leagueId}`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const standings = await response.json();
    console.log(`SportDevs API: Received ${standings.length} standings entries for league ID: ${leagueId}`);
    return standings;
    
  } catch (error) {
    console.error("Error fetching standings by league ID:", error);
    throw error;
  }
}
