-- Create table for match-specific team statistics
CREATE TABLE public.pandascore_match_team_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  esport_type TEXT NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  win_rate INTEGER NOT NULL DEFAULT 0,
  recent_form TEXT,
  tournament_wins INTEGER NOT NULL DEFAULT 0,
  total_matches INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  league_performance JSONB DEFAULT '{}',
  recent_win_rate_30d INTEGER DEFAULT 0,
  last_10_matches_detail JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pandascore_match_team_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Match team stats are publicly readable" 
ON public.pandascore_match_team_stats 
FOR SELECT 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_pandascore_match_team_stats_match_id ON public.pandascore_match_team_stats(match_id);
CREATE INDEX idx_pandascore_match_team_stats_team_id ON public.pandascore_match_team_stats(team_id);
CREATE INDEX idx_pandascore_match_team_stats_esport_type ON public.pandascore_match_team_stats(esport_type);
CREATE UNIQUE INDEX idx_pandascore_match_team_stats_unique ON public.pandascore_match_team_stats(match_id, team_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pandascore_match_team_stats_updated_at
BEFORE UPDATE ON public.pandascore_match_team_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();