-- Create a table to store pre-calculated team statistics
CREATE TABLE public.pandascore_team_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id TEXT NOT NULL,
  esport_type TEXT NOT NULL,
  win_rate INTEGER NOT NULL DEFAULT 0,
  recent_form TEXT,
  tournament_wins INTEGER NOT NULL DEFAULT 0,
  total_matches INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, esport_type)
);

-- Enable RLS
ALTER TABLE public.pandascore_team_stats ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Team stats are publicly readable" 
ON public.pandascore_team_stats 
FOR SELECT 
USING (true);

-- Create a table to store head-to-head records
CREATE TABLE public.pandascore_head_to_head (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team1_id TEXT NOT NULL,
  team2_id TEXT NOT NULL,
  esport_type TEXT NOT NULL,
  team1_wins INTEGER NOT NULL DEFAULT 0,
  team2_wins INTEGER NOT NULL DEFAULT 0,
  total_matches INTEGER NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team1_id, team2_id, esport_type)
);

-- Enable RLS
ALTER TABLE public.pandascore_head_to_head ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Head to head records are publicly readable" 
ON public.pandascore_head_to_head 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pandascore_team_stats_updated_at
BEFORE UPDATE ON public.pandascore_team_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pandascore_head_to_head_updated_at
BEFORE UPDATE ON public.pandascore_head_to_head
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();