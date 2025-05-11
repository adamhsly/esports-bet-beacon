
import { BookmakerOdds, Market } from '@/components/OddsTable';

// Types for SportDevs API responses
export interface SportDevsMatch {
  id: string;
  status: string;
  start_time: string;
  opponents: SportDevsTeam[];
  tournament: {
    id: string;
    name: string;
    slug: string;
  };
  serie: {
    id: string;
    name: string;
    full_name: string;
  };
  videogame: {
    id: string;
    name: string;
    slug: string;
  };
  format: {
    type: string;
    best_of: number;
  };
  name?: string;
  home_team_name?: string;
  away_team_name?: string;
  home_team_hash_image?: string;
  away_team_hash_image?: string;
  class_name?: string;
  tournament_name?: string;
  league_name?: string;
}

export interface SportDevsTeam {
  id: string;
  name: string;
  image_url: string | null;
  slug: string;
}

export interface SportDevsOdds {
  bookmakers: SportDevsBookmaker[];
}

export interface SportDevsBookmaker {
  name: string;
  image_url: string | null;
  markets: SportDevsMarket[];
}

export interface SportDevsMarket {
  name: string;
  outcomes: SportDevsOutcome[];
}

export interface SportDevsOutcome {
  name: string;
  price: number;
}

export interface MatchInfo {
  id: string;
  teams: {
    name: string;
    logo: string;
  }[];
  startTime: string;
  tournament: string;
  esportType: string;
  bestOf: number;
}

export interface TeamInfo {
  name: string;
  logo: string;
}

export interface OddsResponse {
  bookmakerOdds: BookmakerOdds[];
  markets: Market[];
}

export interface StandingsTeam {
  id: string;
  position: number;
  team: {
    id: string;
    name: string;
    logo: string;
  };
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  score_for?: number;
  score_against?: number;
}
