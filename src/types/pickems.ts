export type PickemsSlateStatus = 'draft' | 'published' | 'closed' | 'settled';

export interface PickemsSlate {
  id: string;
  name: string;
  description: string | null;
  tournament_id: string | null;
  tournament_name: string | null;
  esport_type: string | null;
  start_date: string;
  end_date: string;
  status: PickemsSlateStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  tiebreaker_match_id?: string | null;
}

export interface PickemsSlateMatch {
  id: string;
  slate_id: string;
  match_id: string;
  display_order: number;
  created_at: string;
}

export interface PickemsEntry {
  id: string;
  slate_id: string;
  user_id: string;
  total_score: number;
  correct_picks: number;
  total_picks: number;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  streak_bonus?: number;
  longest_streak?: number;
  tiebreaker_total_maps?: number | null;
  tiebreaker_actual?: number | null;
  tiebreaker_delta?: number | null;
}

export interface PickemsPick {
  id: string;
  entry_id: string;
  slate_id: string;
  match_id: string;
  picked_team_id: string;
  is_correct: boolean | null;
  points_awarded: number;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
  tiebreaker_total_maps?: number | null;
}

export interface PickemsMatchTeam {
  id: string | number;
  name?: string;
  image_url?: string | null;
  acronym?: string | null;
}

export interface PickemsEnrichedMatch {
  match_id: string;
  esport_type?: string | null;
  teams?: any;
  team_a?: PickemsMatchTeam | null;
  team_b?: PickemsMatchTeam | null;
  start_time: string | null;
  status: string | null;
  tournament_name?: string | null;
  league_name?: string | null;
  winner_id?: string | number | null;
  draw?: boolean | null;
  number_of_games?: number | null;
  display_order?: number;
}
