-- Create table to store detailed match-by-match breakdown for fantasy scoring
CREATE TABLE public.fantasy_team_match_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.fantasy_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  team_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  team_type TEXT NOT NULL DEFAULT 'pro',
  match_id TEXT NOT NULL,
  match_date TIMESTAMPTZ,
  opponent_name TEXT,
  opponent_logo TEXT,
  result TEXT, -- 'win', 'loss', 'draw'
  score TEXT, -- e.g., '2-0', '16-14'
  map_wins INTEGER DEFAULT 0,
  map_losses INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  is_clean_sweep BOOLEAN DEFAULT FALSE,
  is_tournament_win BOOLEAN DEFAULT FALSE,
  tournament_name TEXT,
  is_star_team BOOLEAN DEFAULT FALSE,
  star_multiplier_applied BOOLEAN DEFAULT FALSE,
  amateur_bonus_applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round_id, user_id, team_id, match_id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_fantasy_team_match_breakdown_round_user ON public.fantasy_team_match_breakdown(round_id, user_id);
CREATE INDEX idx_fantasy_team_match_breakdown_team ON public.fantasy_team_match_breakdown(round_id, user_id, team_id);
CREATE INDEX idx_fantasy_team_match_breakdown_match_date ON public.fantasy_team_match_breakdown(match_date);

-- Enable RLS
ALTER TABLE public.fantasy_team_match_breakdown ENABLE ROW LEVEL SECURITY;

-- Create policies - breakdown data is publicly readable (like scores)
CREATE POLICY "Fantasy team match breakdown is publicly viewable"
ON public.fantasy_team_match_breakdown
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_fantasy_team_match_breakdown_updated_at
BEFORE UPDATE ON public.fantasy_team_match_breakdown
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();