
// Re-export all API functions from the modules

// Configuration
export { API_KEY, BASE_URL, WEB_URL, mapEsportTypeToGameId, mapGameSlugToEsportType } from './apiConfig';

// Types
export type { 
  MatchInfo, 
  TeamInfo, 
  SportDevsMatch, 
  SportDevsTeam, 
  SportDevsOdds,
  OddsResponse,
  StandingsTeam
} from './types';

// Transformers
export { transformMatchData, transformOddsData } from './transformers';

// Match related functions
export {
  fetchUpcomingMatches,
  fetchLiveMatches,
  fetchMatchById,
  fetchMatchGames,
  fetchMatchStatistics,
  fetchMatchesByTournamentId,
  fetchMatchOdds
} from './matchesApi';

// Team related functions
export {
  fetchTeamById,
  fetchPlayersByTeamId,
  searchTeams
} from './teamsApi';

// Player related functions
export {
  fetchPlayerById,
  searchPlayers
} from './playersApi';

// Tournament related functions
export {
  fetchTournaments,
  fetchTournamentById,
  fetchLeagueByName,
  fetchStandingsByLeagueId
} from './tournamentsApi';

// News related functions
export {
  fetchNews
} from './newsApi';
