
-- Create table for comprehensive FACEIT player statistics
CREATE TABLE public.faceit_player_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id text NOT NULL UNIQUE,
  nickname text NOT NULL,
  avatar text,
  country text,
  skill_level integer,
  faceit_elo integer,
  membership text,
  
  -- Game-specific statistics for CS2
  total_matches integer DEFAULT 0,
  total_wins integer DEFAULT 0,
  win_rate numeric(5,2) DEFAULT 0,
  avg_kd_ratio numeric(5,2) DEFAULT 0,
  avg_headshots_percent numeric(5,2) DEFAULT 0,
  longest_win_streak integer DEFAULT 0,
  current_win_streak integer DEFAULT 0,
  recent_results jsonb DEFAULT '[]'::jsonb,
  
  -- Performance trends
  recent_form text, -- 'excellent', 'good', 'average', 'poor'
  map_stats jsonb DEFAULT '{}'::jsonb,
  
  -- Metadata
  last_fetched_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create table for match-specific player performance
CREATE TABLE public.faceit_player_match_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id text NOT NULL,
  player_id text NOT NULL,
  player_name text NOT NULL,
  team_name text,
  
  -- Match performance (when available)
  kills integer,
  deaths integer,
  assists integer,
  kd_ratio numeric(5,2),
  headshots integer,
  headshots_percent numeric(5,2),
  mvps integer,
  
  -- Match context
  match_date timestamp with time zone,
  map_name text,
  match_result text, -- 'win', 'loss'
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  
  -- Foreign key reference to faceit_matches
  CONSTRAINT fk_faceit_match FOREIGN KEY (match_id) REFERENCES faceit_matches(match_id),
  CONSTRAINT fk_faceit_player FOREIGN KEY (player_id) REFERENCES faceit_player_stats(player_id)
);

-- Create indexes for efficient querying
CREATE INDEX idx_faceit_player_stats_player_id ON faceit_player_stats(player_id);
CREATE INDEX idx_faceit_player_stats_last_fetched ON faceit_player_stats(last_fetched_at);
CREATE INDEX idx_faceit_player_stats_skill_level ON faceit_player_stats(skill_level);
CREATE INDEX idx_faceit_player_match_stats_match_id ON faceit_player_match_stats(match_id);
CREATE INDEX idx_faceit_player_match_stats_player_id ON faceit_player_match_stats(player_id);
CREATE INDEX idx_faceit_player_match_stats_match_date ON faceit_player_match_stats(match_date);

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER update_faceit_player_stats_updated_at
  BEFORE UPDATE ON faceit_player_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
