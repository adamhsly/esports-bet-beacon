CREATE OR REPLACE FUNCTION public.get_paying_user_wow_retention()
RETURNS TABLE(
  current_week_paying_users bigint,
  previous_week_paying_users bigint,
  retained_users bigint,
  retention_rate numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH params AS (
    SELECT
      date_trunc('week', now()) AS curr_start,
      date_trunc('week', now()) + interval '7 days' AS curr_end,
      date_trunc('week', now()) - interval '7 days' AS prev_start,
      date_trunc('week', now()) AS prev_end
  ),
  curr AS (
    SELECT DISTINCT re.user_id
    FROM round_entries re
    INNER JOIN profiles p ON p.id = re.user_id
    CROSS JOIN params
    WHERE re.status = 'completed'
      AND (re.amount_paid - COALESCE(re.promo_used, 0)) > 0
      AND (p.test IS NULL OR p.test = false)
      AND re.created_at >= params.curr_start
      AND re.created_at < params.curr_end
  ),
  prev AS (
    SELECT DISTINCT re.user_id
    FROM round_entries re
    INNER JOIN profiles p ON p.id = re.user_id
    CROSS JOIN params
    WHERE re.status = 'completed'
      AND (re.amount_paid - COALESCE(re.promo_used, 0)) > 0
      AND (p.test IS NULL OR p.test = false)
      AND re.created_at >= params.prev_start
      AND re.created_at < params.prev_end
  )
  SELECT
    (SELECT COUNT(*) FROM curr)::bigint AS current_week_paying_users,
    (SELECT COUNT(*) FROM prev)::bigint AS previous_week_paying_users,
    (SELECT COUNT(*) FROM prev p WHERE EXISTS (SELECT 1 FROM curr c WHERE c.user_id = p.user_id))::bigint AS retained_users,
    CASE
      WHEN (SELECT COUNT(*) FROM prev) = 0 THEN 0
      ELSE ROUND(
        (SELECT COUNT(*) FROM prev p WHERE EXISTS (SELECT 1 FROM curr c WHERE c.user_id = p.user_id))::numeric
        / (SELECT COUNT(*) FROM prev)::numeric * 100,
        1
      )
    END AS retention_rate;
$$;