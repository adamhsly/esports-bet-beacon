
// This file is now just a re-export of the refactored API modules
// We keep this file for backwards compatibility with existing code
export * from './api';

// Explicitly re-export specific functions that are being used by components
export { 
  searchTeams, 
  searchPlayers, 
  fetchTeamById, 
  fetchPlayersByTeamId 
} from './api/teamsApi';

export { 
  fetchPlayerById 
} from './api/playersApi';

export { 
  fetchLiveMatches, 
  fetchUpcomingMatches,
  fetchMatchById,
  fetchMatchesByTournamentId,
  fetchMatchOdds
} from './api/matchesApi';

export {
  fetchTournaments,
  fetchTournamentById,
  fetchLeagueByName,
  fetchStandingsByLeagueId
} from './api/tournamentsApi';

export {
  fetchNews
} from './api/newsApi';

// Re-export transformers
export {
  transformMatchData,
  transformOddsData
} from './api/transformers';

// Re-export types
export type {
  MatchInfo,
  TeamInfo,
  SportDevsMatch,
  SportDevsTeam,
  SportDevsOdds,
  OddsResponse,
  StandingsTeam
} from './api/types';
