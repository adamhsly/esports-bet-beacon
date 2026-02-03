-- Update get_public_fantasy_leaderboard to use 24-hour window for position changes
CREATE OR REPLACE FUNCTION public.get_public_fantasy_leaderboard(
  p_round_id uuid,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  user_position integer,
  user_id uuid,
  total_score integer,
  position_change integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_users AS (
    SELECT 
      p.user_id,
      p.total_score,
      ROW_NUMBER() OVER (ORDER BY p.total_score DESC, p.created_at ASC) AS position
    FROM fantasy_round_picks p
    WHERE p.round_id = p_round_id
  ),
  -- Get the most recent snapshot from at least 24 hours ago for each user
  previous_snapshots AS (
    SELECT DISTINCT ON (lps.user_id)
      lps.user_id,
      lps.position as previous_position
    FROM leaderboard_position_snapshots lps
    WHERE lps.round_id = p_round_id
      AND lps.snapshot_at <= NOW() - INTERVAL '24 hours'
    ORDER BY lps.user_id, lps.snapshot_at DESC
  )
  SELECT 
    ru.position::integer AS user_position,
    ru.user_id,
    ru.total_score::integer,
    CASE 
      WHEN ps.previous_position IS NULL THEN NULL
      ELSE (ps.previous_position - ru.position::integer)
    END::integer AS position_change
  FROM ranked_users ru
  LEFT JOIN previous_snapshots ps ON ps.user_id = ru.user_id
  ORDER BY ru.position
  LIMIT p_limit;
END;
$$;