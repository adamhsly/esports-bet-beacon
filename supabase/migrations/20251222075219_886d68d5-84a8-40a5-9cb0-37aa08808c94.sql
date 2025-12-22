-- Update the get_public_fantasy_leaderboard function to use fantasy_round_picks.total_score 
-- which is the authoritative source updated by the scoring job

CREATE OR REPLACE FUNCTION public.get_public_fantasy_leaderboard(
  p_round_id UUID,
  p_limit INTEGER DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  total_score INTEGER,
  user_position INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    frp.user_id,
    COALESCE(frp.total_score, 0)::integer AS total_score,
    ROW_NUMBER() OVER (ORDER BY COALESCE(frp.total_score, 0) DESC, frp.user_id)::integer AS user_position
  FROM public.fantasy_round_picks frp
  WHERE frp.round_id = p_round_id
  ORDER BY COALESCE(frp.total_score, 0) DESC, frp.user_id
  LIMIT COALESCE(p_limit, 10000);
$$;