
-- Create table for storing player match history
CREATE TABLE public.faceit_player_match_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id text NOT NULL,
  match_id text NOT NULL,
  player_nickname text NOT NULL,
  
  -- Match details
  match_date timestamp with time zone NOT NULL,
  map_name text,
  team_name text,
  opponent_team_name text,
  match_result text, -- 'win', 'loss'
  
  -- Player performance stats (when available from detailed match data)
  kills integer,
  deaths integer,
  assists integer,
  kd_ratio numeric(5,2),
  headshots integer,
  headshots_percent numeric(5,2),
  mvps integer,
  adr numeric(5,2),
  
  -- Match context
  competition_name text,
  competition_type text,
  faceit_elo_change integer,
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Constraints
  UNIQUE(player_id, match_id),
  
  -- Foreign key reference to faceit_player_stats
  CONSTRAINT fk_faceit_player FOREIGN KEY (player_id) REFERENCES faceit_player_stats(player_id)
);

-- Create indexes for efficient querying
CREATE INDEX idx_faceit_player_match_history_player_id ON faceit_player_match_history(player_id);
CREATE INDEX idx_faceit_player_match_history_match_date ON faceit_player_match_history(match_date DESC);
CREATE INDEX idx_faceit_player_match_history_player_date ON faceit_player_match_history(player_id, match_date DESC);

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER update_faceit_player_match_history_updated_at
  BEFORE UPDATE ON faceit_player_match_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add recent_form field to faceit_player_stats table (string representation of last 5 results)
ALTER TABLE faceit_player_stats 
ADD COLUMN IF NOT EXISTS recent_form_string text;
