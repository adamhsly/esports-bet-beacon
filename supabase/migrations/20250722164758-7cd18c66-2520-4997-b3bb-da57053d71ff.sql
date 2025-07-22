
-- Remove old fantasy tables
DROP TABLE IF EXISTS live_fantasy_scores CASCADE;
DROP TABLE IF EXISTS fantasy_match_scores CASCADE;
DROP TABLE IF EXISTS fantasy_live_sessions CASCADE;
DROP TABLE IF EXISTS fantasy_league_participants CASCADE;
DROP TABLE IF EXISTS fantasy_teams CASCADE;

-- Create new fantasy rounds table
CREATE TABLE public.fantasy_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'active', 'finished')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user team picks per round
CREATE TABLE public.fantasy_round_picks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  round_id UUID REFERENCES public.fantasy_rounds(id) NOT NULL,
  team_picks JSONB NOT NULL DEFAULT '[]'::jsonb,
  bench_team JSONB,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, round_id)
);

-- Create live scoring tracking
CREATE TABLE public.fantasy_round_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID REFERENCES public.fantasy_rounds(id) NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  team_type TEXT NOT NULL CHECK (team_type IN ('pro', 'amateur')),
  team_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  current_score INTEGER NOT NULL DEFAULT 0,
  match_wins INTEGER NOT NULL DEFAULT 0,
  map_wins INTEGER NOT NULL DEFAULT 0,
  tournaments_won INTEGER NOT NULL DEFAULT 0,
  clean_sweeps INTEGER NOT NULL DEFAULT 0,
  matches_played INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.fantasy_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fantasy_round_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fantasy_round_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies for fantasy_rounds (public read)
CREATE POLICY "Fantasy rounds are publicly readable" 
  ON public.fantasy_rounds 
  FOR SELECT 
  USING (true);

-- RLS policies for fantasy_round_picks
CREATE POLICY "Users can view their own picks" 
  ON public.fantasy_round_picks 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own picks" 
  ON public.fantasy_round_picks 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own picks" 
  ON public.fantasy_round_picks 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- RLS policies for fantasy_round_scores
CREATE POLICY "Users can view their own scores" 
  ON public.fantasy_round_scores 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage all scores" 
  ON public.fantasy_round_scores 
  FOR ALL 
  USING (true);

-- Create indexes for better performance
CREATE INDEX idx_fantasy_rounds_status_type ON public.fantasy_rounds(status, type);
CREATE INDEX idx_fantasy_rounds_dates ON public.fantasy_rounds(start_date, end_date);
CREATE INDEX idx_fantasy_round_picks_user_round ON public.fantasy_round_picks(user_id, round_id);
CREATE INDEX idx_fantasy_round_scores_round_user ON public.fantasy_round_scores(round_id, user_id);
CREATE INDEX idx_fantasy_round_scores_team ON public.fantasy_round_scores(team_type, team_id);

-- Create trigger for updated_at columns
CREATE TRIGGER update_fantasy_rounds_updated_at 
  BEFORE UPDATE ON public.fantasy_rounds 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fantasy_round_picks_updated_at 
  BEFORE UPDATE ON public.fantasy_round_picks 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial fantasy rounds for testing
INSERT INTO public.fantasy_rounds (type, start_date, end_date, status) VALUES
('daily', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day', 'open'),
('weekly', DATE_TRUNC('week', CURRENT_DATE), DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week', 'open'),
('monthly', DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month', 'open');
