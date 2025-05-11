import { API_KEY, BASE_URL, mapEsportTypeToGameId } from './apiConfig';
import { MatchInfo, SportDevsMatch, OddsResponse } from './types';
import { transformMatchData, transformOddsData } from './transformers';

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
    
    // Use the correct endpoint format for fetching by ID
    const response = await fetch(
      `${BASE_URL}/matches?id=eq.${matchId}`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SportDevs API error ${response.status}:`, errorText);
      throw new Error(`API error: ${response.status}`);
    }
    
    const matches = await response.json();
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

// Fetch match games by match ID
export async function fetchMatchGames(matchId: string) {
  try {
    console.log(`SportDevs API: Fetching match games for ID: ${matchId}`);
    
    const response = await fetch(
      `${BASE_URL}/matches-games?match_id=eq.${matchId}`,
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
    
    const games = await response.json();
    console.log(`SportDevs API: Received ${games.length} games for match ID: ${matchId}`);
    return games;
    
  } catch (error) {
    console.error("Error fetching match games:", error);
    throw error;
  }
}

// Fetch match statistics by match ID
export async function fetchMatchStatistics(matchId: string) {
  try {
    console.log(`SportDevs API: Fetching match statistics for ID: ${matchId}`);
    
    const response = await fetch(
      `${BASE_URL}/matches-games-statistics?match_id=eq.${matchId}`,
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
    
    const statistics = await response.json();
    console.log(`SportDevs API: Received statistics for match ID: ${matchId}`);
    return statistics;
    
  } catch (error) {
    console.error("Error fetching match statistics:", error);
    throw error;
  }
}

// Fetch matches by tournament ID
export async function fetchMatchesByTournamentId(tournamentId: string): Promise<MatchInfo[]> {
  try {
    console.log(`SportDevs API: Fetching matches for tournament ID: ${tournamentId}`);
    
    const response = await fetch(
      `${BASE_URL}/matches?tournament_id=eq.${tournamentId}`,
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
    
    const matches = await response.json();
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

// Fetch odds for a specific match
export async function fetchMatchOdds(matchId: string): Promise<OddsResponse> {
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
    
    const oddsData = await response.json();
    console.log(`SportDevs API: Received odds for match ID: ${matchId}`);
    
    // Now transformOddsData is properly imported from transformers
    return transformOddsData(oddsData);
  } catch (error) {
    console.error("Error fetching match odds from SportDevs:", error);
    throw error;
  }
}
