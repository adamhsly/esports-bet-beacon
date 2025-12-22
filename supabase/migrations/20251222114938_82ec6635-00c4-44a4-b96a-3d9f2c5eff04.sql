-- Update the daily_match_counts_filtered function to exclude cancelled/aborted matches
CREATE OR REPLACE FUNCTION public.daily_match_counts_filtered(
  start_date timestamptz,
  end_date timestamptz,
  p_source text DEFAULT 'all',
  p_esport_type text DEFAULT 'all',
  p_status text DEFAULT 'all'
)
RETURNS TABLE (
  match_date date,
  source text,
  esport_type text,
  match_count bigint
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH pandascore_counts AS (
    SELECT
      date(pm.start_time) AS match_date,
      'professional'::text AS source,
      pm.esport_type,
      COUNT(*) AS match_count
    FROM pandascore_matches pm
    WHERE pm.start_time >= start_date
      AND pm.start_time < end_date
      AND (p_source = 'all' OR p_source = 'professional')
      AND (p_esport_type = 'all' OR pm.esport_type = p_esport_type)
      AND (p_status = 'all' OR pm.status = p_status)
      AND pm.status NOT ILIKE 'cancel%'
      AND pm.status NOT ILIKE 'abort%'
    GROUP BY date(pm.start_time), pm.esport_type
  ),
  faceit_counts AS (
    SELECT
      COALESCE(fm.match_date, date(fm.started_at)) AS match_date,
      'amateur'::text AS source,
      fm.game AS esport_type,
      COUNT(*) AS match_count
    FROM faceit_matches fm
    WHERE COALESCE(fm.started_at, fm.scheduled_at) >= start_date
      AND COALESCE(fm.started_at, fm.scheduled_at) < end_date
      AND (p_source = 'all' OR p_source = 'amateur')
      AND (p_esport_type = 'all' OR fm.game = p_esport_type)
      AND (p_status = 'all' OR fm.status = p_status)
      AND fm.status NOT IN ('CANCELLED', 'ABORTED')
    GROUP BY COALESCE(fm.match_date, date(fm.started_at)), fm.game
  )
  SELECT * FROM pandascore_counts
  UNION ALL
  SELECT * FROM faceit_counts;
END;
$function$;