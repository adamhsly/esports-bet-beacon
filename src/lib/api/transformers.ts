
import { MatchInfo, SportDevsOdds, TeamInfo, OddsResponse } from './types';

// Helper function to transform match data to our app's format
export function transformMatchData(match: any, esportType: string): MatchInfo {
  // Extract team data, ensuring we have 2 teams
  let teams: TeamInfo[] = [];
  
  // First try to get teams from direct opponents data
  if (match.opponents && match.opponents.length > 0) {
    teams = match.opponents.slice(0, 2).map((team: any) => ({
      name: team.name,
      logo: team.image_url || '/placeholder.svg'
    }));
  }
  // Then try home_team and away_team
  else if (match.home_team_name && match.away_team_name) {
    teams = [
      { 
        name: match.home_team_name, 
        logo: match.home_team_hash_image ? 
          `https://assets.b365api.com/images/team/m/${match.home_team_hash_image}.png` : 
          '/placeholder.svg' 
      },
      { 
        name: match.away_team_name, 
        logo: match.away_team_hash_image ? 
          `https://assets.b365api.com/images/team/m/${match.away_team_hash_image}.png` : 
          '/placeholder.svg' 
      }
    ];
  }
  // Then try to extract from name as last resort
  else if (match.name && match.name.includes(' vs ')) {
    const [team1Name, team2Name] = match.name.split(' vs ').map((t: string) => t.trim());
    teams = [
      { name: team1Name, logo: '/placeholder.svg' },
      { name: team2Name, logo: '/placeholder.svg' }
    ];
  }
  
  // If we don't have 2 teams, add placeholders
  while (teams.length < 2) {
    teams.push({
      name: 'TBD',
      logo: '/placeholder.svg'
    });
  }
  
  // Determine the tournament name
  const tournamentName = match.tournament?.name || match.serie?.name || match.tournament_name || match.league_name || "Unknown Tournament";
  
  // Determine the best of format
  const bestOf = match.format?.best_of || 3;
  
  return {
    id: match.id,
    teams: [teams[0], teams[1]],
    startTime: match.start_time || new Date().toISOString(),
    tournament: tournamentName,
    esportType: esportType,
    bestOf: bestOf
  };
}

// Helper function to transform odds data to our app's format
export function transformOddsData(oddsData: SportDevsOdds): OddsResponse {
  // Extract unique market types from all bookmakers
  const marketTypes = new Set<string>();
  const marketOptionsMap: Record<string, string[]> = {};
  
  oddsData.bookmakers.forEach(bookmaker => {
    bookmaker.markets.forEach(market => {
      marketTypes.add(market.name);
      
      // Initialize market options array if needed
      if (!marketOptionsMap[market.name]) {
        marketOptionsMap[market.name] = [];
      }
      
      // Add unique options to the market
      market.outcomes.forEach(outcome => {
        if (!marketOptionsMap[market.name].includes(outcome.name)) {
          marketOptionsMap[market.name].push(outcome.name);
        }
      });
    });
  });
  
  // Transform markets
  const markets = Array.from(marketTypes).map(marketName => ({
    name: marketName,
    options: marketOptionsMap[marketName] || []
  }));
  
  // Transform bookmaker odds
  const bookmakerOdds = oddsData.bookmakers.map(bookmaker => {
    const odds: Record<string, string> = {};
    
    // Populate odds for each market and outcome
    bookmaker.markets.forEach(market => {
      market.outcomes.forEach(outcome => {
        odds[outcome.name] = outcome.price.toString();
      });
    });
    
    return {
      bookmaker: bookmaker.name,
      logo: bookmaker.image_url || '/placeholder.svg',
      odds,
      link: `https://example.com?bookmaker=${bookmaker.name.toLowerCase()}`, // This would be your affiliate link
    };
  });
  
  return { bookmakerOdds, markets };
}
