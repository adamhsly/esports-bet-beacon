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
    SELECT DISTINCT re.user_id
    FROM round_entries re
    INNER JOIN profiles p ON p.id = re.user_id
    WHERE re.status = 'completed'
      AND (re.amount_paid - COALESCE(re.promo_used, 0)) > 0
      AND (p.test IS NULL OR p.test = false)
  ),
  paid_weeks_per_user AS (
    -- Count distinct play weeks (any activity: paid entries OR free picks) for paying users
    SELECT user_id, COUNT(DISTINCT wk) AS weeks_played FROM (
      SELECT re.user_id, date_trunc('week', re.created_at) AS wk
      FROM round_entries re
      INNER JOIN paid_users pu ON pu.user_id = re.user_id
      WHERE re.status = 'completed'
      UNION
      SELECT frp.user_id, date_trunc('week', frp.submitted_at) AS wk
      FROM fantasy_round_picks frp
      INNER JOIN paid_users pu ON pu.user_id = frp.user_id
    ) t
    GROUP BY user_id
  ),
  free_users AS (
    SELECT DISTINCT frp.user_id
    FROM fantasy_round_picks frp
    INNER JOIN profiles p ON p.id = frp.user_id
    LEFT JOIN paid_users pu ON pu.user_id = frp.user_id
    WHERE pu.user_id IS NULL
      AND (p.test IS NULL OR p.test = false)
  ),
  free_weeks_per_user AS (
    SELECT frp.user_id, COUNT(DISTINCT date_trunc('week', frp.submitted_at)) AS weeks_played
    FROM fantasy_round_picks frp
    INNER JOIN free_users fu ON fu.user_id = frp.user_id
    GROUP BY frp.user_id
  )
  SELECT
    (SELECT COUNT(*) FROM paid_weeks_per_user)::bigint,
    COALESCE(ROUND((SELECT AVG(weeks_played) FROM paid_weeks_per_user)::numeric, 2), 0),
    COALESCE((SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY weeks_played) FROM paid_weeks_per_user)::numeric, 0),
    COALESCE((SELECT MAX(weeks_played) FROM paid_weeks_per_user), 0)::bigint,
    (SELECT COUNT(*) FROM free_weeks_per_user)::bigint,
    COALESCE(ROUND((SELECT AVG(weeks_played) FROM free_weeks_per_user)::numeric, 2), 0),
    COALESCE((SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY weeks_played) FROM free_weeks_per_user)::numeric, 0),
    COALESCE((SELECT MAX(weeks_played) FROM free_weeks_per_user), 0)::bigint;
$$;