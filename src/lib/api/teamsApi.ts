
import { API_KEY, WEB_URL } from './apiConfig';

// Fetch team by ID
export async function fetchTeamById(teamId: string) {
  try {
    console.log(`SportDevs API: Fetching team details for ID: ${teamId}`);
    
    const response = await fetch(
      `${WEB_URL}/teams?id=eq.${teamId}`,
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
    
    const teams = await response.json();
    
    if (!teams || teams.length === 0) {
      throw new Error('Team not found');
    }
    
    return teams[0];
    
  } catch (error) {
    console.error("Error fetching team by ID:", error);
    throw error;
  }
}

// Fetch players by team ID
export async function fetchPlayersByTeamId(teamId: string) {
  try {
    console.log(`SportDevs API: Fetching players for team ID: ${teamId}`);
    
    const response = await fetch(
      `${WEB_URL}/players?team_id=eq.${teamId}`,
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
    
    const players = await response.json();
    console.log(`SportDevs API: Received ${players.length} players for team ID: ${teamId}`);
    return players;
    
  } catch (error) {
    console.error("Error fetching players by team ID:", error);
    throw error;
  }
}

// Search for teams by name
export async function searchTeams(query: string, limit = 10) {
  try {
    console.log(`SportDevs API: Searching teams with query: "${query}"`);
    
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `${WEB_URL}/teams?name=like.*${encodedQuery}*&limit=${limit}`,
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
    
    const teams = await response.json();
    console.log(`SportDevs API: Found ${teams.length} teams matching "${query}"`);
    return teams;
    
  } catch (error) {
    console.error("Error searching teams:", error);
    throw error;
  }
}
