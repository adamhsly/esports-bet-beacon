-- Create the leaderboard_position_snapshots table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.leaderboard_position_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  round_id UUID NOT NULL REFERENCES public.fantasy_rounds(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  total_score NUMERIC NOT NULL DEFAULT 0,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_user_round 
ON public.leaderboard_position_snapshots(user_id, round_id, snapshot_at DESC);

CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_round 
ON public.leaderboard_position_snapshots(round_id, snapshot_at DESC);

-- Enable RLS
ALTER TABLE public.leaderboard_position_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow public read access (leaderboard data is public)
CREATE POLICY "Anyone can view leaderboard snapshots"
ON public.leaderboard_position_snapshots
FOR SELECT
USING (true);

-- Only system can insert/update
CREATE POLICY "Service role can manage snapshots"
ON public.leaderboard_position_snapshots
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create or replace the get_position_change function
CREATE OR REPLACE FUNCTION public.get_position_change(
  p_user_id UUID,
  p_round_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_position INTEGER;
  v_previous_position INTEGER;
BEGIN
  -- Get the two most recent snapshots for this user/round
  SELECT position INTO v_current_position
  FROM leaderboard_position_snapshots
  WHERE user_id = p_user_id AND round_id = p_round_id
  ORDER BY snapshot_at DESC
  LIMIT 1;
  
  SELECT position INTO v_previous_position
  FROM leaderboard_position_snapshots
  WHERE user_id = p_user_id AND round_id = p_round_id
  ORDER BY snapshot_at DESC
  LIMIT 1 OFFSET 1;
  
  -- If we don't have previous data, return NULL (no change to show)
  IF v_previous_position IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Return the difference (positive = moved up, negative = moved down)
  RETURN v_previous_position - v_current_position;
END;
$$;

-- Update get_public_fantasy_leaderboard to handle missing table gracefully
CREATE OR REPLACE FUNCTION public.get_public_fantasy_leaderboard(p_round_id UUID)
RETURNS TABLE(
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  total_score NUMERIC,
  rank BIGINT,
  position_change INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    COALESCE(prof.display_name, 'Anonymous') as display_name,
    prof.avatar_url,
    p.total_score::NUMERIC,
    ROW_NUMBER() OVER (ORDER BY p.total_score DESC, p.submitted_at ASC)::BIGINT as rank,
    get_position_change(p.user_id, p_round_id) as position_change
  FROM fantasy_round_picks p
  LEFT JOIN profiles prof ON prof.id = p.user_id
  WHERE p.round_id = p_round_id
  ORDER BY p.total_score DESC, p.submitted_at ASC;
END;
$$;

-- Update get_global_leaderboard to handle missing table gracefully  
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  total_credits BIGINT,
  rounds_played BIGINT,
  rounds_won BIGINT,
  rank BIGINT,
  position_change INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      w.user_id,
      SUM(w.credits_awarded)::BIGINT as total_credits,
      COUNT(DISTINCT w.round_id)::BIGINT as rounds_won
    FROM fantasy_round_winners w
    GROUP BY w.user_id
  ),
  user_rounds AS (
    SELECT 
      p.user_id,
      COUNT(DISTINCT p.round_id)::BIGINT as rounds_played
    FROM fantasy_round_picks p
    GROUP BY p.user_id
  ),
  combined AS (
    SELECT 
      COALESCE(s.user_id, r.user_id) as user_id,
      COALESCE(s.total_credits, 0) as total_credits,
      COALESCE(r.rounds_played, 0) as rounds_played,
      COALESCE(s.rounds_won, 0) as rounds_won
    FROM user_stats s
    FULL OUTER JOIN user_rounds r ON s.user_id = r.user_id
  )
  SELECT 
    c.user_id,
    COALESCE(prof.display_name, 'Anonymous') as display_name,
    prof.avatar_url,
    c.total_credits,
    c.rounds_played,
    c.rounds_won,
    ROW_NUMBER() OVER (ORDER BY c.total_credits DESC, c.rounds_won DESC, c.rounds_played DESC)::BIGINT as rank,
    NULL::INTEGER as position_change
  FROM combined c
  LEFT JOIN profiles prof ON prof.id = c.user_id
  ORDER BY c.total_credits DESC, c.rounds_won DESC, c.rounds_played DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;