-- Drop and recreate get_platform_period_stats with corrected calculations
DROP FUNCTION IF EXISTS public.get_platform_period_stats(timestamptz);

CREATE OR REPLACE FUNCTION public.get_platform_period_stats(p_start timestamptz)
RETURNS TABLE (
  new_users bigint,
  real_round_participants bigint,
  round_entry_real_revenue bigint,
  round_entry_bonus_used bigint,
  voucher_prizes_paid bigint,
  credit_prizes_paid bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- New real users created in period
    (SELECT COUNT(*)
     FROM profiles p
     WHERE p.created_at >= p_start
     AND (p.test IS NULL OR p.test = false))::bigint as new_users,

    -- Real users who participated in rounds during period
    (SELECT COUNT(DISTINCT frp.user_id)
     FROM fantasy_round_picks frp
     INNER JOIN profiles p ON p.id = frp.user_id
     WHERE frp.created_at >= p_start
     AND (p.test IS NULL OR p.test = false))::bigint as real_round_participants,

    -- Round entry real revenue (actual stripe payments minus promo used)
    (SELECT COALESCE(SUM(re.amount_paid - COALESCE(re.promo_used, 0)), 0)
     FROM round_entries re
     INNER JOIN profiles p ON p.id = re.user_id
     WHERE re.status = 'completed'
     AND re.paid_at >= p_start
     AND (p.test IS NULL OR p.test = false))::bigint as round_entry_real_revenue,

    -- Round entry bonus/promo used
    (SELECT COALESCE(SUM(COALESCE(re.promo_used, 0)), 0)
     FROM round_entries re
     INNER JOIN profiles p ON p.id = re.user_id
     WHERE re.status = 'completed'
     AND re.paid_at >= p_start
     AND (p.test IS NULL OR p.test = false))::bigint as round_entry_bonus_used,

    -- Voucher prizes paid out (from affiliate_payouts)
    (SELECT COALESCE(SUM(ap.amount), 0)
     FROM affiliate_payouts ap
     WHERE ap.status = 'paid'
     AND ap.paid_at >= p_start)::bigint as voucher_prizes_paid,

    -- Credit prizes paid to real users
    (SELECT COALESCE(SUM(frw.credits_awarded), 0)
     FROM fantasy_round_winners frw
     INNER JOIN profiles p ON p.id = frw.user_id
     WHERE frw.awarded_at >= p_start
     AND (p.test IS NULL OR p.test = false))::bigint as credit_prizes_paid;
$$;

-- Grant execute to authenticated users (admin check is done in frontend)
GRANT EXECUTE ON FUNCTION public.get_platform_period_stats(timestamptz) TO authenticated;

-- Drop and recreate get_platform_all_time_stats with corrected calculations
DROP FUNCTION IF EXISTS public.get_platform_all_time_stats();

CREATE OR REPLACE FUNCTION public.get_platform_all_time_stats()
RETURNS TABLE (
  total_real_users bigint,
  total_round_participants bigint,
  total_real_revenue bigint,
  total_bonus_used bigint,
  total_voucher_prizes_paid bigint,
  total_credit_prizes_paid bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Total real users (non-test)
    (SELECT COUNT(*)
     FROM profiles p
     WHERE (p.test IS NULL OR p.test = false))::bigint as total_real_users,

    -- Total real users who have participated in any round
    (SELECT COUNT(DISTINCT frp.user_id)
     FROM fantasy_round_picks frp
     INNER JOIN profiles p ON p.id = frp.user_id
     WHERE (p.test IS NULL OR p.test = false))::bigint as total_round_participants,

    -- Total real revenue from completed round entries (stripe payments minus promo)
    (SELECT COALESCE(SUM(re.amount_paid - COALESCE(re.promo_used, 0)), 0)
     FROM round_entries re
     INNER JOIN profiles p ON p.id = re.user_id
     WHERE re.status = 'completed'
     AND (p.test IS NULL OR p.test = false))::bigint as total_real_revenue,

    -- Total bonus/promo used
    (SELECT COALESCE(SUM(COALESCE(re.promo_used, 0)), 0)
     FROM round_entries re
     INNER JOIN profiles p ON p.id = re.user_id
     WHERE re.status = 'completed'
     AND (p.test IS NULL OR p.test = false))::bigint as total_bonus_used,

    -- Total voucher prizes paid
    (SELECT COALESCE(SUM(ap.amount), 0)
     FROM affiliate_payouts ap
     WHERE ap.status = 'paid')::bigint as total_voucher_prizes_paid,

    -- Total credit prizes paid to real users
    (SELECT COALESCE(SUM(frw.credits_awarded), 0)
     FROM fantasy_round_winners frw
     INNER JOIN profiles p ON p.id = frw.user_id
     WHERE (p.test IS NULL OR p.test = false))::bigint as total_credit_prizes_paid;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_platform_all_time_stats() TO authenticated;