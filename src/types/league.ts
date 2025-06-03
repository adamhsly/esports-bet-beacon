
export interface FantasyLeague {
  id: string;
  league_name: string;
  league_description?: string;
  league_type: 'private' | 'public' | 'friends-only';
  created_by_user_id: string;
  max_participants: number;
  current_participants: number;
  entry_fee: number;
  prize_pool: number;
  season_start: string;
  season_end: string;
  scoring_config: Record<string, any>;
  league_settings: Record<string, any>;
  invite_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeagueParticipant {
  id: string;
  league_id: string;
  user_id: string;
  fantasy_team_id?: string;
  joined_at: string;
  current_rank: number;
  current_score: number;
  is_active: boolean;
}

export interface LeagueInvitation {
  id: string;
  league_id: string;
  invited_by_user_id: string;
  invited_user_email?: string;
  invited_user_id?: string;
  invitation_status: 'pending' | 'accepted' | 'declined' | 'expired';
  invited_at: string;
  responded_at?: string;
  expires_at: string;
}

export interface FantasyMatchup {
  id: string;
  league_id: string;
  week_number: number;
  team_1_id: string;
  team_2_id: string;
  team_1_score: number;
  team_2_score: number;
  winner_team_id?: string;
  matchup_date: string;
  status: 'scheduled' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
}
