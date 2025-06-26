
// Game-specific player data fetchers for PandaScore API
export interface PlayerData {
  nickname: string;
  player_id: string;
  position?: string;
  role?: string;
}

export interface GameSpecificPlayerFetcher {
  fetchTeamPlayers: (apiKey: string, teamId: string, matchId?: string) => Promise<PlayerData[]>;
  fetchMatchPlayers: (apiKey: string, matchId: string) => Promise<PlayerData[]>;
  getPositionMapping: (role: string) => string;
}

// CS:GO/CS2 Player Fetcher
export const csgoPlayerFetcher: GameSpecificPlayerFetcher = {
  async fetchTeamPlayers(apiKey: string, teamId: string): Promise<PlayerData[]> {
    try {
      console.log(`🎯 Fetching CS:GO team ${teamId} roster...`);
      const response = await fetch(`https://api.pandascore.co/csgo/teams/${teamId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.log(`⚠️ CS:GO team ${teamId} roster fetch failed: ${response.status}`);
        return [];
      }

      const teamData = await response.json();
      const players = teamData.players || [];
      
      console.log(`👥 CS:GO team ${teamId}: ${players.length} players`);
      return players.map(player => ({
        nickname: player.name,
        player_id: player.id?.toString(),
        position: csgoPlayerFetcher.getPositionMapping(player.role || 'Rifler')
      }));
    } catch (error) {
      console.error(`Error fetching CS:GO team ${teamId} players:`, error);
      return [];
    }
  },

  async fetchMatchPlayers(apiKey: string, matchId: string): Promise<PlayerData[]> {
    try {
      console.log(`🎯 Fetching CS:GO match ${matchId} players...`);
      const response = await fetch(`https://api.pandascore.co/csgo/matches/${matchId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.log(`⚠️ CS:GO match ${matchId} players fetch failed: ${response.status}`);
        return [];
      }

      const matchData = await response.json();
      const allPlayers = [];
      
      if (matchData.opponents) {
        for (const opponent of matchData.opponents) {
          if (opponent.opponent?.players) {
            const teamPlayers = opponent.opponent.players.map(player => ({
              nickname: player.name,
              player_id: player.id?.toString(),
              position: csgoPlayerFetcher.getPositionMapping(player.role || 'Rifler')
            }));
            allPlayers.push(...teamPlayers);
          }
        }
      }
      
      console.log(`👥 CS:GO match ${matchId}: ${allPlayers.length} total players`);
      return allPlayers;
    } catch (error) {
      console.error(`Error fetching CS:GO match ${matchId} players:`, error);
      return [];
    }
  },

  getPositionMapping(role: string): string {
    const roleMap = {
      'awper': 'AWPer',
      'igl': 'IGL',
      'entry': 'Entry Fragger',
      'support': 'Support',
      'lurker': 'Lurker',
      'rifler': 'Rifler'
    };
    return roleMap[role.toLowerCase()] || 'Player';
  }
};

// League of Legends Player Fetcher
export const lolPlayerFetcher: GameSpecificPlayerFetcher = {
  async fetchTeamPlayers(apiKey: string, teamId: string): Promise<PlayerData[]> {
    try {
      console.log(`🎯 Fetching LoL team ${teamId} roster...`);
      const response = await fetch(`https://api.pandascore.co/lol/teams/${teamId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.log(`⚠️ LoL team ${teamId} roster fetch failed: ${response.status}`);
        return [];
      }

      const teamData = await response.json();
      const players = teamData.players || [];
      
      console.log(`👥 LoL team ${teamId}: ${players.length} players`);
      return players.map(player => ({
        nickname: player.name,
        player_id: player.id?.toString(),
        position: lolPlayerFetcher.getPositionMapping(player.role || 'Player')
      }));
    } catch (error) {
      console.error(`Error fetching LoL team ${teamId} players:`, error);
      return [];
    }
  },

  async fetchMatchPlayers(apiKey: string, matchId: string): Promise<PlayerData[]> {
    try {
      console.log(`🎯 Fetching LoL match ${matchId} players...`);
      const response = await fetch(`https://api.pandascore.co/lol/matches/${matchId}/players/stats`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const playerStats = await response.json();
        console.log(`👥 LoL match ${matchId}: ${playerStats.length} players from stats`);
        return playerStats.map(stat => ({
          nickname: stat.player?.name || stat.name,
          player_id: stat.player?.id?.toString() || stat.id?.toString(),
          position: lolPlayerFetcher.getPositionMapping(stat.player?.role || stat.role || 'Player')
        }));
      }
      
      // Fallback to match data
      const matchResponse = await fetch(`https://api.pandascore.co/lol/matches/${matchId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!matchResponse.ok) {
        console.log(`⚠️ LoL match ${matchId} fallback fetch failed: ${matchResponse.status}`);
        return [];
      }

      const matchData = await matchResponse.json();
      const allPlayers = [];
      
      if (matchData.opponents) {
        for (const opponent of matchData.opponents) {
          if (opponent.opponent?.players) {
            const teamPlayers = opponent.opponent.players.map(player => ({
              nickname: player.name,
              player_id: player.id?.toString(),
              position: lolPlayerFetcher.getPositionMapping(player.role || 'Player')
            }));
            allPlayers.push(...teamPlayers);
          }
        }
      }
      
      console.log(`👥 LoL match ${matchId}: ${allPlayers.length} total players`);
      return allPlayers;
    } catch (error) {
      console.error(`Error fetching LoL match ${matchId} players:`, error);
      return [];
    }
  },

  getPositionMapping(role: string): string {
    const roleMap = {
      'top': 'Top',
      'jun': 'Jungle',
      'jungle': 'Jungle',
      'mid': 'Mid',
      'adc': 'ADC',
      'bot': 'ADC',
      'sup': 'Support',
      'support': 'Support'
    };
    return roleMap[role.toLowerCase()] || 'Player';
  }
};

// Valorant Player Fetcher
export const valorantPlayerFetcher: GameSpecificPlayerFetcher = {
  async fetchTeamPlayers(apiKey: string, teamId: string): Promise<PlayerData[]> {
    try {
      console.log(`🎯 Fetching Valorant team ${teamId} roster...`);
      const response = await fetch(`https://api.pandascore.co/valorant/teams/${teamId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.log(`⚠️ Valorant team ${teamId} roster fetch failed: ${response.status}`);
        return [];
      }

      const teamData = await response.json();
      const players = teamData.players || [];
      
      console.log(`👥 Valorant team ${teamId}: ${players.length} players`);
      return players.map(player => ({
        nickname: player.name,
        player_id: player.id?.toString(),
        position: valorantPlayerFetcher.getPositionMapping(player.role || 'Duelist')
      }));
    } catch (error) {
      console.error(`Error fetching Valorant team ${teamId} players:`, error);
      return [];
    }
  },

  async fetchMatchPlayers(apiKey: string, matchId: string): Promise<PlayerData[]> {
    try {
      console.log(`🎯 Fetching Valorant match ${matchId} players...`);
      const response = await fetch(`https://api.pandascore.co/valorant/matches/${matchId}/players/stats`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const playerStats = await response.json();
        console.log(`👥 Valorant match ${matchId}: ${playerStats.length} players from stats`);
        return playerStats.map(stat => ({
          nickname: stat.player?.name || stat.name,
          player_id: stat.player?.id?.toString() || stat.id?.toString(),
          position: valorantPlayerFetcher.getPositionMapping(stat.player?.role || stat.role || 'Duelist')
        }));
      }
      
      // Fallback to match data
      const matchResponse = await fetch(`https://api.pandascore.co/valorant/matches/${matchId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!matchResponse.ok) {
        console.log(`⚠️ Valorant match ${matchId} fallback fetch failed: ${matchResponse.status}`);
        return [];
      }

      const matchData = await matchResponse.json();
      const allPlayers = [];
      
      if (matchData.opponents) {
        for (const opponent of matchData.opponents) {
          if (opponent.opponent?.players) {
            const teamPlayers = opponent.opponent.players.map(player => ({
              nickname: player.name,
              player_id: player.id?.toString(),
              position: valorantPlayerFetcher.getPositionMapping(player.role || 'Duelist')
            }));
            allPlayers.push(...teamPlayers);
          }
        }
      }
      
      console.log(`👥 Valorant match ${matchId}: ${allPlayers.length} total players`);
      return allPlayers;
    } catch (error) {
      console.error(`Error fetching Valorant match ${matchId} players:`, error);
      return [];
    }
  },

  getPositionMapping(role: string): string {
    const roleMap = {
      'duelist': 'Duelist',
      'controller': 'Controller',
      'initiator': 'Initiator',
      'sentinel': 'Sentinel',
      'flex': 'Flex'
    };
    return roleMap[role.toLowerCase()] || 'Player';
  }
};

// Dota 2 Player Fetcher
export const dota2PlayerFetcher: GameSpecificPlayerFetcher = {
  async fetchTeamPlayers(apiKey: string, teamId: string): Promise<PlayerData[]> {
    try {
      console.log(`🎯 Fetching Dota2 team ${teamId} roster...`);
      const response = await fetch(`https://api.pandascore.co/dota2/teams/${teamId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.log(`⚠️ Dota2 team ${teamId} roster fetch failed: ${response.status}`);
        return [];
      }

      const teamData = await response.json();
      const players = teamData.players || [];
      
      console.log(`👥 Dota2 team ${teamId}: ${players.length} players`);
      return players.map(player => ({
        nickname: player.name,
        player_id: player.id?.toString(),
        position: dota2PlayerFetcher.getPositionMapping(player.role || 'Core')
      }));
    } catch (error) {
      console.error(`Error fetching Dota2 team ${teamId} players:`, error);
      return [];
    }
  },

  async fetchMatchPlayers(apiKey: string, matchId: string): Promise<PlayerData[]> {
    try {
      console.log(`🎯 Fetching Dota2 match ${matchId} players...`);
      const response = await fetch(`https://api.pandascore.co/dota2/matches/${matchId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.log(`⚠️ Dota2 match ${matchId} players fetch failed: ${response.status}`);
        return [];
      }

      const matchData = await response.json();
      const allPlayers = [];
      
      if (matchData.opponents) {
        for (const opponent of matchData.opponents) {
          if (opponent.opponent?.players) {
            const teamPlayers = opponent.opponent.players.map(player => ({
              nickname: player.name,
              player_id: player.id?.toString(),
              position: dota2PlayerFetcher.getPositionMapping(player.role || 'Core')
            }));
            allPlayers.push(...teamPlayers);
          }
        }
      }
      
      console.log(`👥 Dota2 match ${matchId}: ${allPlayers.length} total players`);
      return allPlayers;
    } catch (error) {
      console.error(`Error fetching Dota2 match ${matchId} players:`, error);
      return [];
    }
  },

  getPositionMapping(role: string): string {
    const roleMap = {
      'carry': 'Carry',
      'mid': 'Mid',
      'offlaner': 'Offlaner',
      'support': 'Support',
      'hard_support': 'Hard Support',
      'core': 'Core'
    };
    return roleMap[role.toLowerCase()] || 'Player';
  }
};

// Overwatch Player Fetcher
export const overwatchPlayerFetcher: GameSpecificPlayerFetcher = {
  async fetchTeamPlayers(apiKey: string, teamId: string): Promise<PlayerData[]> {
    try {
      console.log(`🎯 Fetching Overwatch team ${teamId} roster...`);
      const response = await fetch(`https://api.pandascore.co/ow/teams/${teamId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.log(`⚠️ Overwatch team ${teamId} roster fetch failed: ${response.status}`);
        return [];
      }

      const teamData = await response.json();
      const players = teamData.players || [];
      
      console.log(`👥 Overwatch team ${teamId}: ${players.length} players`);
      return players.map(player => ({
        nickname: player.name,
        player_id: player.id?.toString(),
        position: overwatchPlayerFetcher.getPositionMapping(player.role || 'DPS')
      }));
    } catch (error) {
      console.error(`Error fetching Overwatch team ${teamId} players:`, error);
      return [];
    }
  },

  async fetchMatchPlayers(apiKey: string, matchId: string): Promise<PlayerData[]> {
    try {
      console.log(`🎯 Fetching Overwatch match ${matchId} players...`);
      const response = await fetch(`https://api.pandascore.co/ow/matches/${matchId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.log(`⚠️ Overwatch match ${matchId} players fetch failed: ${response.status}`);
        return [];
      }

      const matchData = await response.json();
      const allPlayers = [];
      
      if (matchData.opponents) {
        for (const opponent of matchData.opponents) {
          if (opponent.opponent?.players) {
            const teamPlayers = opponent.opponent.players.map(player => ({
              nickname: player.name,
              player_id: player.id?.toString(),
              position: overwatchPlayerFetcher.getPositionMapping(player.role || 'DPS')
            }));
            allPlayers.push(...teamPlayers);
          }
        }
      }
      
      console.log(`👥 Overwatch match ${matchId}: ${allPlayers.length} total players`);
      return allPlayers;
    } catch (error) {
      console.error(`Error fetching Overwatch match ${matchId} players:`, error);
      return [];
    }
  },

  getPositionMapping(role: string): string {
    const roleMap = {
      'tank': 'Tank',
      'dps': 'DPS',
      'damage': 'DPS',
      'support': 'Support',
      'flex': 'Flex'
    };
    return roleMap[role.toLowerCase()] || 'Player';
  }
};

// Main fetcher selector
export function getPlayerFetcher(game: string): GameSpecificPlayerFetcher {
  const gameMap = {
    'csgo': csgoPlayerFetcher,
    'cs2': csgoPlayerFetcher,
    'lol': lolPlayerFetcher,
    'valorant': valorantPlayerFetcher,
    'dota2': dota2PlayerFetcher,
    'ow': overwatchPlayerFetcher
  };
  
  return gameMap[game.toLowerCase()] || csgoPlayerFetcher;
}

// Enhanced player fetching with multiple strategies
export async function fetchPlayersForTeam(
  game: string, 
  apiKey: string, 
  teamId: string, 
  matchId?: string
): Promise<PlayerData[]> {
  const fetcher = getPlayerFetcher(game);
  
  console.log(`🎮 Fetching ${game} players for team ${teamId}...`);
  
  // Strategy 1: Try team roster first
  let players = await fetcher.fetchTeamPlayers(apiKey, teamId);
  
  // Strategy 2: If no players and we have a match ID, try match-specific data
  if (players.length === 0 && matchId) {
    console.log(`🔄 No team roster found, trying match-specific data for ${game} match ${matchId}...`);
    const matchPlayers = await fetcher.fetchMatchPlayers(apiKey, matchId);
    // Filter players for this specific team if possible
    players = matchPlayers; // For now, return all match players
  }
  
  console.log(`✅ ${game} team ${teamId}: ${players.length} players found`);
  return players;
}
