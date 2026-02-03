-- Drop and recreate get_global_leaderboard with timeframe support
DROP FUNCTION IF EXISTS public.get_global_leaderboard(integer, integer);

CREATE OR REPLACE FUNCTION public.get_global_leaderboard(
  p_timeframe text DEFAULT 'all',
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  user_position integer,
  user_id uuid,
  username text,
  avatar_url text,
  avatar_frame_id text,
  avatar_border_id text,
  total_points bigint,
  rounds_played bigint,
  avg_points_per_round numeric,
  position_change integer,
  rank integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date timestamp with time zone;
BEGIN
  -- Calculate date range based on timeframe
  IF p_timeframe = 'weekly' THEN
    v_start_date := date_trunc('week', now());
  ELSIF p_timeframe = 'monthly' THEN
    v_start_date := date_trunc('month', now());
  ELSE
    v_start_date := NULL; -- all time
  END IF;

  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      frw.user_id,
      SUM(frw.credits_awarded) AS total_points,
      COUNT(DISTINCT frw.round_id) AS rounds_played
    FROM fantasy_round_winners frw
    WHERE (v_start_date IS NULL OR frw.created_at >= v_start_date)
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
    p.avatar_frame_id::text,
    p.avatar_border_id::text,
    ru.total_points,
    ru.rounds_played,
    ru.avg_points AS avg_points_per_round,
    NULL::integer AS position_change,
    ru.position::integer AS rank
  FROM ranked_users ru
  LEFT JOIN profiles p ON p.id = ru.user_id
  ORDER BY ru.position
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;