CREATE OR REPLACE FUNCTION public.get_user_weeks_played_stats()
RETURNS TABLE(
  paid_user_count bigint,
  paid_avg_weeks numeric,
  paid_median_weeks numeric,
  paid_max_weeks bigint,
  free_user_count bigint,
  free_avg_weeks numeric,
  free_median_weeks numeric,
  free_max_weeks bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH paid_users AS (
    SELECT re.user_id, COUNT(*) AS rounds_played
    FROM round_entries re
    INNER JOIN profiles p ON p.id = re.user_id
    WHERE re.status = 'completed'
      AND (re.amount_paid - COALESCE(re.promo_used, 0)) > 0
      AND (p.test IS NULL OR p.test = false)
    GROUP BY re.user_id
  ),
  free_users AS (
    SELECT frp.user_id, COUNT(DISTINCT frp.round_id) AS rounds_played
    FROM fantasy_round_picks frp
    INNER JOIN fantasy_rounds fr ON fr.id = frp.round_id
    INNER JOIN profiles p ON p.id = frp.user_id
    WHERE (fr.is_paid IS NULL OR fr.is_paid = false)
      AND (p.test IS NULL OR p.test = false)
    GROUP BY frp.user_id
  )
  SELECT
    (SELECT COUNT(*) FROM paid_users)::bigint,
    COALESCE(ROUND((SELECT AVG(rounds_played) FROM paid_users)::numeric, 2), 0),
    COALESCE((SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY rounds_played) FROM paid_users)::numeric, 0),
    COALESCE((SELECT MAX(rounds_played) FROM paid_users), 0)::bigint,
    (SELECT COUNT(*) FROM free_users)::bigint,
    COALESCE(ROUND((SELECT AVG(rounds_played) FROM free_users)::numeric, 2), 0),
    COALESCE((SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY rounds_played) FROM free_users)::numeric, 0),
    COALESCE((SELECT MAX(rounds_played) FROM free_users), 0)::bigint;
$$;