-- Drop existing functions and recreate them without the snapshot_type reference
DROP FUNCTION IF EXISTS public.get_public_fantasy_leaderboard(uuid, integer);
DROP FUNCTION IF EXISTS public.get_global_leaderboard(integer, integer);

-- Recreate get_public_fantasy_leaderboard with corrected position_change logic
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
  -- Get the second most recent snapshot for each user (the "previous" position)
  previous_snapshots AS (
    SELECT 
      lps.user_id,
      lps.position as previous_position
    FROM (
      SELECT 
        lps2.user_id,
        lps2.position,
        ROW_NUMBER() OVER (PARTITION BY lps2.user_id ORDER BY lps2.snapshot_at DESC) as rn
      FROM leaderboard_position_snapshots lps2
      WHERE lps2.round_id = p_round_id
    ) lps
    WHERE lps.rn = 2
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

-- Recreate get_global_leaderboard
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  user_position integer,
  user_id uuid,
  username text,
  avatar_url text,
  total_points bigint,
  rounds_played bigint,
  avg_points_per_round numeric,
  position_change integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      frw.user_id,
      SUM(frw.credits_awarded) AS total_points,
      COUNT(DISTINCT frw.round_id) AS rounds_played
    FROM fantasy_round_winners frw
    GROUP BY frw.user_id
  ),
  ranked_users AS (
    SELECT 
      us.user_id,
      us.total_points,
      us.rounds_played,
      ROUND(us.total_points::numeric / NULLIF(us.rounds_played, 0), 1) AS avg_points,
      ROW_NUMBER() OVER (ORDER BY us.total_points DESC, us.rounds_played DESC) AS position
    FROM user_stats us
  )
  SELECT 
    ru.position::integer AS user_position,
    ru.user_id,
    COALESCE(p.username, p.full_name, 'Anonymous')::text AS username,
    p.avatar_url::text,
    ru.total_points,
    ru.rounds_played,
    ru.avg_points AS avg_points_per_round,
    NULL::integer AS position_change
  FROM ranked_users ru
  LEFT JOIN profiles p ON p.id = ru.user_id
  ORDER BY ru.position
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;