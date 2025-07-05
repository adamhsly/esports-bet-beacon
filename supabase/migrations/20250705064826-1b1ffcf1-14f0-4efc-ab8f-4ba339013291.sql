-- Create enhanced player statistics table
CREATE TABLE public.pandascore_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id TEXT NOT NULL,
  esport_type TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT,
  image_url TEXT,
  nationality TEXT,
  role TEXT,
  team_id TEXT,
  team_name TEXT,
  active BOOLEAN DEFAULT true,
  
  -- Career Statistics
  career_stats JSONB DEFAULT '{}',
  recent_stats JSONB DEFAULT '{}',
  tournament_stats JSONB DEFAULT '{}',
  
  -- Performance Metrics
  kda_ratio DECIMAL,
  avg_kills DECIMAL,
  avg_deaths DECIMAL,
  avg_assists DECIMAL,
  headshot_percentage DECIMAL,
  clutch_success_rate DECIMAL,
  
  -- Additional Data
  earnings INTEGER DEFAULT 0,
  achievements JSONB DEFAULT '[]',
  social_media JSONB DEFAULT '{}',
  
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(player_id, esport_type)
);

-- Create enhanced team detailed statistics table
CREATE TABLE public.pandascore_team_detailed_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id TEXT NOT NULL,
  esport_type TEXT NOT NULL,
  
  -- Map Statistics
  map_stats JSONB DEFAULT '{}',
  
  -- Economic Performance
  eco_round_win_rate DECIMAL,
  save_round_win_rate DECIMAL,
  pistol_round_win_rate DECIMAL,
  
  -- Tactical Analysis
  average_round_length DECIMAL,
  preferred_side TEXT,
  ct_side_win_rate DECIMAL,
  t_side_win_rate DECIMAL,
  
  -- Recent Performance (last 30 days)
  recent_matches_count INTEGER DEFAULT 0,
  recent_win_rate DECIMAL,
  recent_avg_rating DECIMAL,
  
  -- Tournament Performance
  major_wins INTEGER DEFAULT 0,
  tier1_wins INTEGER DEFAULT 0,
  prize_money INTEGER DEFAULT 0,
  
  -- Roster Information
  current_roster JSONB DEFAULT '[]',
  roster_changes JSONB DEFAULT '[]',
  
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(team_id, esport_type)
);

-- Create player match performance history table
CREATE TABLE public.pandascore_player_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  esport_type TEXT NOT NULL,
  
  -- Match Context
  match_date TIMESTAMP WITH TIME ZONE NOT NULL,
  tournament_name TEXT,
  opponent_team TEXT,
  map_name TEXT,
  result TEXT, -- 'win', 'loss'
  
  -- Performance Stats
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  kda_ratio DECIMAL,
  adr DECIMAL,
  rating DECIMAL,
  
  -- Role-specific stats (game dependent)
  role_stats JSONB DEFAULT '{}',
  
  -- Additional Context
  mvp BOOLEAN DEFAULT false,
  clutches_won INTEGER DEFAULT 0,
  clutches_attempted INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(player_id, match_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.pandascore_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pandascore_team_detailed_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pandascore_player_matches ENABLE ROW LEVEL SECURITY;

-- Create public read policies
CREATE POLICY "Enhanced player data is publicly readable" 
ON public.pandascore_players 
FOR SELECT 
USING (true);

CREATE POLICY "Enhanced team stats are publicly readable" 
ON public.pandascore_team_detailed_stats 
FOR SELECT 
USING (true);

CREATE POLICY "Player match history is publicly readable" 
ON public.pandascore_player_matches 
FOR SELECT 
USING (true);

-- Create update triggers for timestamps
CREATE TRIGGER update_pandascore_players_updated_at
BEFORE UPDATE ON public.pandascore_players
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pandascore_team_detailed_stats_updated_at
BEFORE UPDATE ON public.pandascore_team_detailed_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_pandascore_players_team_id ON public.pandascore_players(team_id);
CREATE INDEX idx_pandascore_players_esport_type ON public.pandascore_players(esport_type);
CREATE INDEX idx_pandascore_team_detailed_stats_team_id ON public.pandascore_team_detailed_stats(team_id);
CREATE INDEX idx_pandascore_player_matches_player_id ON public.pandascore_player_matches(player_id);
CREATE INDEX idx_pandascore_player_matches_match_date ON public.pandascore_player_matches(match_date DESC);