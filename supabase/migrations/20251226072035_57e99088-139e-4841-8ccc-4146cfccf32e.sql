-- Admin-only RPC helpers for PlatformDashboardPage

CREATE OR REPLACE FUNCTION public.get_platform_period_stats(
  p_start timestamptz,
  p_end timestamptz DEFAULT now()
)
RETURNS TABLE(
  new_users int,
  real_round_participants int,
  round_entry_real_revenue bigint,
  round_entry_bonus_used bigint,
  battle_pass_revenue bigint,
  successful_logins int,
  prizes_paid_out bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') IS NOT TRUE THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    -- New users (non-test)
    (
      SELECT COUNT(*)::int
      FROM public.profiles p
      WHERE p.created_at >= p_start
        AND COALESCE(p.test, false) = false
    ) AS new_users,

    -- Distinct real users who joined a round in this period
    (
      SELECT COUNT(DISTINCT frp.user_id)::int
      FROM public.fantasy_round_picks frp
      JOIN public.profiles p ON p.id = frp.user_id
      WHERE frp.created_at >= p_start
        AND frp.created_at <= p_end
        AND COALESCE(p.test, false) = false
    ) AS real_round_participants,

    -- Round entry revenue split (amount_paid - promo_used)
    (
      SELECT COALESCE(SUM(COALESCE(re.amount_paid, 0) - COALESCE(re.promo_used, 0)), 0)::bigint
      FROM public.round_entries re
      WHERE re.created_at >= p_start
        AND re.created_at <= p_end
        AND re.status = 'completed'
    ) AS round_entry_real_revenue,

    (
      SELECT COALESCE(SUM(COALESCE(re.promo_used, 0)), 0)::bigint
      FROM public.round_entries re
      WHERE re.created_at >= p_start
        AND re.created_at <= p_end
        AND re.status = 'completed'
    ) AS round_entry_bonus_used,

    -- Battle pass revenue
    (
      SELECT COALESCE(SUM(COALESCE(pr.amount_total, 0)), 0)::bigint
      FROM public.premium_receipts pr
      WHERE pr.created_at >= p_start
        AND pr.created_at <= p_end
    ) AS battle_pass_revenue,

    -- Successful logins (non-test)
    (
      SELECT COUNT(*)::int
      FROM public.profiles p
      WHERE p.last_login_at >= p_start
        AND p.last_login_at <= p_end
        AND COALESCE(p.test, false) = false
    ) AS successful_logins,

    -- Prize payouts to real users
    (
      SELECT COALESCE(SUM(COALESCE(w.credits_awarded, 0)), 0)::bigint
      FROM public.fantasy_round_winners w
      JOIN public.profiles p ON p.id = w.user_id
      WHERE w.awarded_at >= p_start
        AND w.awarded_at <= p_end
        AND COALESCE(p.test, false) = false
    ) AS prizes_paid_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_platform_all_time_stats()
RETURNS TABLE(
  total_users int,
  total_real_users int,
  total_real_revenue bigint,
  total_bonus_used bigint,
  total_rounds int,
  total_prizes_paid_out bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') IS NOT TRUE THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH round_rev AS (
    SELECT
      COALESCE(SUM(COALESCE(re.amount_paid, 0) - COALESCE(re.promo_used, 0)), 0)::bigint AS real_rev,
      COALESCE(SUM(COALESCE(re.promo_used, 0)), 0)::bigint AS bonus_used
    FROM public.round_entries re
    WHERE re.status = 'completed'
  ),
  pass_rev AS (
    SELECT COALESCE(SUM(COALESCE(pr.amount_total, 0)), 0)::bigint AS pass_rev
    FROM public.premium_receipts pr
  ),
  prizes AS (
    SELECT COALESCE(SUM(COALESCE(w.credits_awarded, 0)), 0)::bigint AS prizes_paid
    FROM public.fantasy_round_winners w
    JOIN public.profiles p ON p.id = w.user_id
    WHERE COALESCE(p.test, false) = false
  )
  SELECT
    (SELECT COUNT(*)::int FROM public.profiles) AS total_users,
    (SELECT COUNT(*)::int FROM public.profiles p WHERE COALESCE(p.test, false) = false) AS total_real_users,
    ((SELECT real_rev FROM round_rev) + (SELECT pass_rev FROM pass_rev)) AS total_real_revenue,
    (SELECT bonus_used FROM round_rev) AS total_bonus_used,
    (SELECT COUNT(*)::int FROM public.fantasy_rounds) AS total_rounds,
    (SELECT prizes_paid FROM prizes) AS total_prizes_paid_out;
END;
$$;