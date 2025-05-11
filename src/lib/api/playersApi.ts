
import { API_KEY, WEB_URL } from './apiConfig';

// Fetch player by ID
export async function fetchPlayerById(playerId: string) {
  try {
    console.log(`SportDevs API: Fetching player details for ID: ${playerId}`);
    
    const response = await fetch(
      `${WEB_URL}/players?id=eq.${playerId}`,
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
    
    if (!players || players.length === 0) {
      throw new Error('Player not found');
    }
    
    return players[0];
    
  } catch (error) {
    console.error("Error fetching player by ID:", error);
    throw error;
  }
}

// Search for players by name
export async function searchPlayers(query: string, limit = 10) {
  try {
    console.log(`SportDevs API: Searching players with query: "${query}"`);
    
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `${WEB_URL}/players?name=like.*${encodedQuery}*&limit=${limit}`,
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
    console.log(`SportDevs API: Found ${players.length} players matching "${query}"`);
    return players;
    
  } catch (error) {
    console.error("Error searching players:", error);
    throw error;
  }
}
