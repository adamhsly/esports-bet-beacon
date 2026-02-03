-- Drop conflicting function versions to clean up
DROP FUNCTION IF EXISTS public.get_global_leaderboard(text, integer);

-- Recreate single clean version of get_global_leaderboard
DROP FUNCTION IF EXISTS public.get_global_leaderboard(text, integer, integer);

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
BEGIN
  RETURN QUERY
  WITH round_rankings AS (
    SELECT 
      frp.user_id,
      frp.round_id,
      fr.end_date,
      PERCENT_RANK() OVER (
        PARTITION BY frp.round_id 
        ORDER BY frp.total_score DESC
      ) as percentile_rank
    FROM fantasy_round_picks frp
    JOIN fantasy_rounds fr ON fr.id = frp.round_id
    JOIN profiles p ON p.id = frp.user_id
    WHERE fr.status = 'finished'
      AND (p.test IS NOT TRUE OR p.test IS NULL)
      AND (
        CASE p_timeframe
          WHEN 'daily' THEN fr.end_date::date = CURRENT_DATE
          WHEN 'weekly' THEN fr.end_date >= NOW() - INTERVAL '7 days'
          WHEN 'monthly' THEN fr.end_date >= NOW() - INTERVAL '30 days'
          ELSE TRUE
        END
      )
  ),
  scored_rounds AS (
    SELECT 
      rr.user_id,
      CASE 
        WHEN rr.percentile_rank <= 0.01 THEN 100
        WHEN rr.percentile_rank <= 0.05 THEN 70
        WHEN rr.percentile_rank <= 0.10 THEN 50
        WHEN rr.percentile_rank <= 0.25 THEN 30
        ELSE 10
      END as bracket_points
    FROM round_rankings rr
  ),
  aggregated AS (
    SELECT 
      sr.user_id,
      SUM(sr.bracket_points)::BIGINT as total_points,
      COUNT(*)::BIGINT as rounds_played
    FROM scored_rounds sr
    GROUP BY sr.user_id
  ),
  ranked AS (
    SELECT 
      a.user_id,
      COALESCE(p.username, p.full_name, 'Anonymous')::TEXT as username,
      p.avatar_url,
      p.avatar_frame_id,
      p.avatar_border_id,
      a.total_points,
      a.rounds_played,
      ROW_NUMBER() OVER (ORDER BY a.total_points DESC, a.rounds_played DESC)::BIGINT as rank
    FROM aggregated a
    JOIN profiles p ON p.id = a.user_id
  )
  SELECT 
    r.rank::integer AS user_position,
    r.user_id,
    r.username,
    r.avatar_url::text,
    r.avatar_frame_id::text,
    r.avatar_border_id::text,
    r.total_points,
    r.rounds_played,
    ROUND(r.total_points::numeric / NULLIF(r.rounds_played, 0), 1) AS avg_points_per_round,
    NULL::integer AS position_change,
    r.rank::integer AS rank
  FROM ranked r
  ORDER BY r.total_points DESC, r.rounds_played DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;