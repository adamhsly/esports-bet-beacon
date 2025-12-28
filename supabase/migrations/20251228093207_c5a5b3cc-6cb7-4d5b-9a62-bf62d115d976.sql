
-- Fix get_platform_daily_stats to properly calculate voucher prizes
CREATE OR REPLACE FUNCTION public.get_platform_daily_stats(p_start timestamptz, p_end timestamptz)
RETURNS TABLE (
  stat_date date,
  new_users bigint,
  free_round_entries bigint,
  paid_round_entries bigint,
  successful_logins bigint,
  round_entry_real_revenue bigint,
  round_entry_bonus_used bigint,
  battle_pass_revenue bigint,
  voucher_prizes_paid bigint,
  credit_prizes_paid bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(p_start::date, p_end::date, '1 day'::interval)::date AS d
  ),
  daily_new_users AS (
    SELECT p.created_at::date AS d, COUNT(*) AS cnt
    FROM profiles p
    WHERE p.created_at >= p_start AND p.created_at <= p_end
      AND COALESCE(p.test, false) = false
    GROUP BY p.created_at::date
  ),
  daily_free_entries AS (
    SELECT frp.created_at::date AS d, COUNT(*) AS cnt
    FROM fantasy_round_picks frp
    INNER JOIN profiles pf ON pf.id = frp.user_id
    INNER JOIN fantasy_rounds fr ON fr.id = frp.round_id
    WHERE frp.created_at >= p_start AND frp.created_at <= p_end
      AND COALESCE(pf.test, false) = false
      AND COALESCE(fr.is_paid, false) = false
    GROUP BY frp.created_at::date
  ),
  daily_paid_entries AS (
    SELECT re.created_at::date AS d, COUNT(*) AS cnt
    FROM round_entries re
    INNER JOIN profiles pf ON pf.id = re.user_id
    WHERE re.created_at >= p_start AND re.created_at <= p_end
      AND re.status = 'completed'
      AND COALESCE(pf.test, false) = false
    GROUP BY re.created_at::date
  ),
  daily_logins AS (
    SELECT pv.created_at::date AS d, COUNT(*) AS cnt
    FROM page_views pv
    WHERE pv.created_at >= p_start AND pv.created_at <= p_end
      AND pv.page_url LIKE '%/auth%'
    GROUP BY pv.created_at::date
  ),
  daily_real_revenue AS (
    SELECT re.created_at::date AS d, COALESCE(SUM(re.amount_paid), 0) AS amt
    FROM round_entries re
    INNER JOIN profiles pf ON pf.id = re.user_id
    WHERE re.created_at >= p_start AND re.created_at <= p_end
      AND re.status = 'completed'
      AND COALESCE(pf.test, false) = false
    GROUP BY re.created_at::date
  ),
  daily_bonus_used AS (
    SELECT re.created_at::date AS d, COALESCE(SUM(re.promo_used), 0) AS amt
    FROM round_entries re
    INNER JOIN profiles pf ON pf.id = re.user_id
    WHERE re.created_at >= p_start AND re.created_at <= p_end
      AND re.status = 'completed'
      AND COALESCE(pf.test, false) = false
    GROUP BY re.created_at::date
  ),
  daily_battle_pass AS (
    SELECT pr.created_at::date AS d, COALESCE(SUM(pr.amount_total), 0) AS amt
    FROM premium_receipts pr
    INNER JOIN profiles pf ON pf.id = pr.user_id
    WHERE pr.created_at >= p_start AND pr.created_at <= p_end
      AND COALESCE(pf.test, false) = false
    GROUP BY pr.created_at::date
  ),
  daily_vouchers AS (
    -- Calculate voucher prizes from fantasy_round_winners where prize_type = 'vouchers'
    SELECT frw.awarded_at::date AS d, 
           COALESCE(SUM(
             CASE 
               WHEN frw.finish_position = 1 THEN fr.prize_1st
               WHEN frw.finish_position = 2 THEN fr.prize_2nd
               WHEN frw.finish_position = 3 THEN fr.prize_3rd
               ELSE 0
             END
           ), 0) AS amt
    FROM fantasy_round_winners frw
    INNER JOIN profiles pf ON pf.id = frw.user_id
    INNER JOIN fantasy_rounds fr ON fr.id = frw.round_id
    WHERE frw.awarded_at >= p_start AND frw.awarded_at <= p_end
      AND COALESCE(pf.test, false) = false
      AND fr.prize_type = 'vouchers'
    GROUP BY frw.awarded_at::date
  ),
  daily_credits AS (
    -- Credit prizes from rounds where prize_type is 'credits' or null
    SELECT frw.awarded_at::date AS d, COALESCE(SUM(frw.credits_awarded), 0) AS amt
    FROM fantasy_round_winners frw
    INNER JOIN profiles pf ON pf.id = frw.user_id
    INNER JOIN fantasy_rounds fr ON fr.id = frw.round_id
    WHERE frw.awarded_at >= p_start AND frw.awarded_at <= p_end
      AND COALESCE(pf.test, false) = false
      AND (fr.prize_type IS NULL OR fr.prize_type = 'credits')
    GROUP BY frw.awarded_at::date
  )
  SELECT
    ds.d AS stat_date,
    COALESCE(dnu.cnt, 0)::BIGINT AS new_users,
    COALESCE(dfe.cnt, 0)::BIGINT AS free_round_entries,
    COALESCE(dpe.cnt, 0)::BIGINT AS paid_round_entries,
    COALESCE(dl.cnt, 0)::BIGINT AS successful_logins,
    COALESCE(drr.amt, 0)::BIGINT AS round_entry_real_revenue,
    COALESCE(dbu.amt, 0)::BIGINT AS round_entry_bonus_used,
    COALESCE(dbp.amt, 0)::BIGINT AS battle_pass_revenue,
    COALESCE(dv.amt, 0)::BIGINT AS voucher_prizes_paid,
    COALESCE(dc.amt, 0)::BIGINT AS credit_prizes_paid
  FROM date_series ds
  LEFT JOIN daily_new_users dnu ON dnu.d = ds.d
  LEFT JOIN daily_free_entries dfe ON dfe.d = ds.d
  LEFT JOIN daily_paid_entries dpe ON dpe.d = ds.d
  LEFT JOIN daily_logins dl ON dl.d = ds.d
  LEFT JOIN daily_real_revenue drr ON drr.d = ds.d
  LEFT JOIN daily_bonus_used dbu ON dbu.d = ds.d
  LEFT JOIN daily_battle_pass dbp ON dbp.d = ds.d
  LEFT JOIN daily_vouchers dv ON dv.d = ds.d
  LEFT JOIN daily_credits dc ON dc.d = ds.d
  ORDER BY ds.d;
END;
$$;

-- Fix get_platform_all_time_stats to properly calculate voucher prizes
CREATE OR REPLACE FUNCTION public.get_platform_all_time_stats()
RETURNS TABLE (
  total_real_users bigint,
  total_round_participants bigint,
  total_real_revenue bigint,
  total_bonus_used bigint,
  total_free_round_entries bigint,
  total_paid_round_entries bigint,
  total_voucher_prizes_paid bigint,
  total_credit_prizes_paid bigint
)
LANGUAGE sql
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

    -- Total free round entries (picks in non-paid rounds)
    (SELECT COUNT(*)
     FROM fantasy_round_picks frp
     INNER JOIN profiles p ON p.id = frp.user_id
     INNER JOIN fantasy_rounds fr ON fr.id = frp.round_id
     WHERE (p.test IS NULL OR p.test = false)
     AND (fr.is_paid IS NULL OR fr.is_paid = false))::bigint as total_free_round_entries,

    -- Total paid round entries (completed)
    (SELECT COUNT(*)
     FROM round_entries re
     INNER JOIN profiles p ON p.id = re.user_id
     WHERE re.status = 'completed'
     AND (p.test IS NULL OR p.test = false))::bigint as total_paid_round_entries,

    -- Total voucher prizes paid (from fantasy_round_winners where prize_type = 'vouchers')
    (SELECT COALESCE(SUM(
      CASE 
        WHEN frw.finish_position = 1 THEN fr.prize_1st
        WHEN frw.finish_position = 2 THEN fr.prize_2nd
        WHEN frw.finish_position = 3 THEN fr.prize_3rd
        ELSE 0
      END
    ), 0)
     FROM fantasy_round_winners frw
     INNER JOIN fantasy_rounds fr ON fr.id = frw.round_id
     INNER JOIN profiles p ON p.id = frw.user_id
     WHERE fr.prize_type = 'vouchers'
     AND (p.test IS NULL OR p.test = false))::bigint as total_voucher_prizes_paid,

    -- Total credit prizes paid to real users (from rounds with credits prize type)
    (SELECT COALESCE(SUM(frw.credits_awarded), 0)
     FROM fantasy_round_winners frw
     INNER JOIN fantasy_rounds fr ON fr.id = frw.round_id
     INNER JOIN profiles p ON p.id = frw.user_id
     WHERE (fr.prize_type IS NULL OR fr.prize_type = 'credits')
     AND (p.test IS NULL OR p.test = false))::bigint as total_credit_prizes_paid;
$$;
