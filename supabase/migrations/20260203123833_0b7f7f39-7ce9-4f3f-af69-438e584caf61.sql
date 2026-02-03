
-- First ensure the helper function exists
CREATE OR REPLACE FUNCTION public.get_position_change(
  p_user_id UUID,
  p_round_id UUID,
  p_current_position INTEGER,
  p_snapshot_type TEXT DEFAULT 'round'
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_previous_position INTEGER;
BEGIN
  -- Get the most recent previous position snapshot
  SELECT position INTO v_previous_position
  FROM leaderboard_position_snapshots
  WHERE user_id = p_user_id
    AND round_id = p_round_id
    AND snapshot_type = p_snapshot_type
  ORDER BY snapshot_at DESC
  LIMIT 1;

  IF v_previous_position IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN v_previous_position - p_current_position;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_position_change(UUID, UUID, INTEGER, TEXT) TO anon, authenticated;

-- Drop and recreate get_public_fantasy_leaderboard
DROP FUNCTION IF EXISTS public.get_public_fantasy_leaderboard(uuid, integer);

CREATE FUNCTION public.get_public_fantasy_leaderboard(
  p_round_id UUID,
  p_limit INTEGER DEFAULT NULL
)
RETURNS TABLE(
  user_id UUID,
  total_score INTEGER,
  user_position INTEGER,
  position_change INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH ranked_users AS (
    SELECT
      frp.user_id,
      COALESCE(frp.total_score, 0)::integer AS total_score,
      ROW_NUMBER() OVER (ORDER BY COALESCE(frp.total_score, 0) DESC, frp.user_id)::integer AS user_position
    FROM public.fantasy_round_picks frp
    WHERE frp.round_id = p_round_id
  )
  SELECT
    ru.user_id,
    ru.total_score,
    ru.user_position,
    public.get_position_change(ru.user_id, p_round_id, ru.user_position, 'round'::text)::integer as position_change
  FROM ranked_users ru
  ORDER BY ru.total_score DESC, ru.user_id
  LIMIT COALESCE(p_limit, 10000);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_fantasy_leaderboard(uuid, integer) TO anon, authenticated;

-- Drop and recreate get_global_leaderboard
DROP FUNCTION IF EXISTS public.get_global_leaderboard(text, integer);

CREATE FUNCTION public.get_global_leaderboard(
  p_timeframe TEXT DEFAULT 'lifetime',
  p_limit INT DEFAULT 100
)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  avatar_frame_id TEXT,
  avatar_border_id TEXT,
  total_points BIGINT,
  rounds_played BIGINT,
  rank BIGINT,
  position_change INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot_type TEXT;
BEGIN
  v_snapshot_type := 'global_' || p_timeframe;

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
    r.user_id,
    r.username,
    r.avatar_url,
    r.avatar_frame_id,
    r.avatar_border_id,
    r.total_points,
    r.rounds_played,
    r.rank,
    public.get_position_change(r.user_id, '00000000-0000-0000-0000-000000000000'::uuid, r.rank::integer, v_snapshot_type)::integer as position_change
  FROM ranked r
  ORDER BY r.total_points DESC, r.rounds_played DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_global_leaderboard(text, integer) TO anon, authenticated;
