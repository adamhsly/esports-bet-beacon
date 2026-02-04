-- Drop the FK constraint so we can have NULL round_id for global leaderboard snapshots
ALTER TABLE leaderboard_position_snapshots 
DROP CONSTRAINT leaderboard_position_snapshots_round_id_fkey;

-- Make round_id nullable for global leaderboard snapshots
ALTER TABLE leaderboard_position_snapshots 
ALTER COLUMN round_id DROP NOT NULL;

-- Re-add FK constraint but allow NULL values
ALTER TABLE leaderboard_position_snapshots
ADD CONSTRAINT leaderboard_position_snapshots_round_id_fkey 
FOREIGN KEY (round_id) REFERENCES fantasy_rounds(id) ON DELETE CASCADE;

-- Update get_global_leaderboard to calculate position_change using snapshots
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
      ROW_NUMBER() OVER (ORDER BY a.total_points DESC, a.rounds_played DESC)::INTEGER as current_rank
    FROM aggregated a
    JOIN profiles p ON p.id = a.user_id
  ),
  -- Get the most recent snapshot from at least 24 hours ago for each user (NULL round_id = global)
  previous_snapshots AS (
    SELECT DISTINCT ON (lps.user_id)
      lps.user_id,
      lps.position as previous_position
    FROM leaderboard_position_snapshots lps
    WHERE lps.round_id IS NULL
      AND lps.snapshot_at <= NOW() - INTERVAL '24 hours'
    ORDER BY lps.user_id, lps.snapshot_at DESC
  )
  SELECT 
    r.current_rank AS user_position,
    r.user_id,
    r.username,
    r.avatar_url::text,
    r.avatar_frame_id::text,
    r.avatar_border_id::text,
    r.total_points,
    r.rounds_played,
    ROUND(r.total_points::numeric / NULLIF(r.rounds_played, 0), 1) AS avg_points_per_round,
    CASE 
      WHEN ps.previous_position IS NULL THEN NULL
      ELSE (ps.previous_position - r.current_rank)
    END::integer AS position_change,
    r.current_rank AS rank
  FROM ranked r
  LEFT JOIN previous_snapshots ps ON ps.user_id = r.user_id
  ORDER BY r.total_points DESC, r.rounds_played DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Create function to snapshot global leaderboard positions (NULL round_id = global)
CREATE OR REPLACE FUNCTION public.snapshot_global_leaderboard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert current global leaderboard positions as snapshots with NULL round_id
  INSERT INTO leaderboard_position_snapshots (round_id, user_id, position, total_score, snapshot_at)
  SELECT 
    NULL::uuid,  -- NULL round_id indicates global leaderboard
    gl.user_id,
    gl.user_position,
    gl.total_points::integer,
    NOW()
  FROM get_global_leaderboard('lifetime', 1000, 0) gl;
END;
$$;

GRANT EXECUTE ON FUNCTION public.snapshot_global_leaderboard() TO authenticated;

-- Create initial snapshot for global leaderboard
SELECT public.snapshot_global_leaderboard();