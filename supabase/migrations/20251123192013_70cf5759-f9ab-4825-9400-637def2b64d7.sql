-- Update daily_match_counts_filtered to handle cs-all-variants filter
CREATE OR REPLACE FUNCTION public.daily_match_counts_filtered(
  p_target_date timestamp with time zone,
  p_window_days integer DEFAULT 7,
  p_source text DEFAULT 'all',
  p_esport_type text DEFAULT 'all',
  p_status text DEFAULT 'all'
)
RETURNS TABLE(match_date date, total_count bigint, professional_count bigint, amateur_count bigint, live_count bigint, upcoming_count bigint)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH date_range AS (
    SELECT generate_series(
      (p_target_date - (p_window_days || ' days')::interval)::date,
      (p_target_date + (p_window_days || ' days')::interval)::date,
      '1 day'::interval
    )::date AS match_date
  ),
  pandascore_counts AS (
    SELECT 
      DATE(start_time) AS match_date,
      COUNT(*) AS total_count,
      COUNT(*) AS professional_count,
      0::bigint AS amateur_count,
      COUNT(*) FILTER (WHERE status = 'running') AS live_count,
      COUNT(*) FILTER (WHERE status = 'not_started') AS upcoming_count
    FROM pandascore_matches
    WHERE start_time >= (p_target_date - (p_window_days || ' days')::interval)
      AND start_time <= (p_target_date + (p_window_days || ' days')::interval)
      AND (p_esport_type = 'all' OR 
           (p_esport_type = 'cs-all-variants' AND (esport_type ILIKE '%cs2%' OR esport_type ILIKE '%Counter-Strike%' OR esport_type ILIKE '%csgo%')) OR
           (p_esport_type != 'cs-all-variants' AND esport_type ILIKE '%' || p_esport_type || '%'))
      AND (p_status = 'all' OR 
           (p_status = 'live' AND status = 'running') OR
           (p_status = 'upcoming' AND status = 'not_started') OR
           (p_status = 'finished' AND status = 'finished'))
    GROUP BY DATE(start_time)
  ),
  faceit_counts AS (
    SELECT 
      DATE(COALESCE(started_at, scheduled_at)) AS match_date,
      COUNT(*) AS total_count,
      0::bigint AS professional_count,
      COUNT(*) AS amateur_count,
      COUNT(*) FILTER (WHERE status = 'RUNNING') AS live_count,
      COUNT(*) FILTER (WHERE status IN ('SCHEDULED', 'READY', 'CONFIGURING', 'CHECKING_IN')) AS upcoming_count
    FROM faceit_matches
    WHERE COALESCE(started_at, scheduled_at) >= (p_target_date - (p_window_days || ' days')::interval)
      AND COALESCE(started_at, scheduled_at) <= (p_target_date + (p_window_days || ' days')::interval)
      AND (p_esport_type = 'all' OR 
           (p_esport_type = 'cs-all-variants' AND (game ILIKE '%cs2%' OR game ILIKE '%Counter-Strike%' OR game ILIKE '%csgo%')) OR
           (p_esport_type != 'cs-all-variants' AND game ILIKE '%' || p_esport_type || '%'))
      AND (p_status = 'all' OR 
           (p_status = 'live' AND status = 'RUNNING') OR
           (p_status = 'upcoming' AND status IN ('SCHEDULED', 'READY', 'CONFIGURING', 'CHECKING_IN')) OR
           (p_status = 'finished' AND status = 'FINISHED'))
    GROUP BY DATE(COALESCE(started_at, scheduled_at))
  ),
  combined_counts AS (
    SELECT 
      COALESCE(p.match_date, f.match_date) AS match_date,
      COALESCE(p.total_count, 0) + COALESCE(f.total_count, 0) AS total_count,
      COALESCE(p.professional_count, 0) AS professional_count,
      COALESCE(f.amateur_count, 0) AS amateur_count,
      COALESCE(p.live_count, 0) + COALESCE(f.live_count, 0) AS live_count,
      COALESCE(p.upcoming_count, 0) + COALESCE(f.upcoming_count, 0) AS upcoming_count
    FROM pandascore_counts p
    FULL OUTER JOIN faceit_counts f ON p.match_date = f.match_date
  )
  SELECT 
    dr.match_date,
    COALESCE(cc.total_count, 0) AS total_count,
    COALESCE(
      CASE 
        WHEN p_source = 'professional' THEN cc.professional_count
        WHEN p_source = 'amateur' THEN 0
        ELSE cc.professional_count
      END, 0
    ) AS professional_count,
    COALESCE(
      CASE 
        WHEN p_source = 'amateur' THEN cc.amateur_count
        WHEN p_source = 'professional' THEN 0
        ELSE cc.amateur_count
      END, 0
    ) AS amateur_count,
    COALESCE(cc.live_count, 0) AS live_count,
    COALESCE(cc.upcoming_count, 0) AS upcoming_count
  FROM date_range dr
  LEFT JOIN combined_counts cc ON dr.match_date = cc.match_date
  WHERE p_source = 'all' OR 
        (p_source = 'professional' AND COALESCE(cc.professional_count, 0) > 0) OR
        (p_source = 'amateur' AND COALESCE(cc.amateur_count, 0) > 0)
  ORDER BY dr.match_date;
END;
$$;