-- Create RPC function for global leaderboard with percentile-based scoring
CREATE OR REPLACE FUNCTION get_global_leaderboard(
  p_timeframe TEXT DEFAULT 'lifetime',
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  avatar_frame_id TEXT,
  avatar_border_id TEXT,
  total_points BIGINT,
  rounds_played BIGINT,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH round_rankings AS (
    -- Calculate percentile rank for each player in each finished round
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
          ELSE TRUE -- lifetime
        END
      )
  ),
  scored_rounds AS (
    -- Assign bracket points based on percentile
    SELECT 
      rr.user_id,
      CASE 
        WHEN rr.percentile_rank <= 0.01 THEN 100  -- Top 1%
        WHEN rr.percentile_rank <= 0.05 THEN 70   -- Top 5%
        WHEN rr.percentile_rank <= 0.10 THEN 50   -- Top 10%
        WHEN rr.percentile_rank <= 0.25 THEN 30   -- Top 25%
        ELSE 10  -- Participation
      END as bracket_points
    FROM round_rankings rr
  ),
  aggregated AS (
    -- Sum bracket points per user
    SELECT 
      sr.user_id,
      SUM(sr.bracket_points)::BIGINT as total_points,
      COUNT(*)::BIGINT as rounds_played
    FROM scored_rounds sr
    GROUP BY sr.user_id
  )
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
  ORDER BY a.total_points DESC, a.rounds_played DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;