-- Create function to get daily stats for chart visualization
CREATE OR REPLACE FUNCTION get_platform_daily_stats(
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS TABLE (
  stat_date DATE,
  new_users BIGINT,
  free_round_entries BIGINT,
  paid_round_entries BIGINT,
  successful_logins BIGINT,
  round_entry_real_revenue BIGINT,
  round_entry_bonus_used BIGINT,
  battle_pass_revenue BIGINT,
  voucher_prizes_paid BIGINT,
  credit_prizes_paid BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
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
    INNER JOIN profiles pf ON pf.id::text = pv.referrer
    WHERE pv.created_at >= p_start AND pv.created_at <= p_end
      AND pv.page_url LIKE '%/auth%'
      AND COALESCE(pf.test, false) = false
    GROUP BY pv.created_at::date
  ),
  daily_real_revenue AS (
    SELECT re.created_at::date AS d, COALESCE(SUM(re.real_amount), 0) AS amt
    FROM round_entries re
    INNER JOIN profiles pf ON pf.id = re.user_id
    WHERE re.created_at >= p_start AND re.created_at <= p_end
      AND re.status = 'completed'
      AND COALESCE(pf.test, false) = false
    GROUP BY re.created_at::date
  ),
  daily_bonus_used AS (
    SELECT re.created_at::date AS d, COALESCE(SUM(re.bonus_amount), 0) AS amt
    FROM round_entries re
    INNER JOIN profiles pf ON pf.id = re.user_id
    WHERE re.created_at >= p_start AND re.created_at <= p_end
      AND re.status = 'completed'
      AND COALESCE(pf.test, false) = false
    GROUP BY re.created_at::date
  ),
  daily_battle_pass AS (
    SELECT pr.created_at::date AS d, COALESCE(SUM(pr.amount_gbp_cents), 0) AS amt
    FROM premium_receipts pr
    INNER JOIN profiles pf ON pf.id = pr.user_id
    WHERE pr.created_at >= p_start AND pr.created_at <= p_end
      AND COALESCE(pf.test, false) = false
    GROUP BY pr.created_at::date
  ),
  daily_vouchers AS (
    SELECT frw.awarded_at::date AS d, COALESCE(SUM(frw.credits_awarded), 0) AS amt
    FROM fantasy_round_winners frw
    INNER JOIN profiles pf ON pf.id = frw.user_id
    INNER JOIN fantasy_rounds fr ON fr.id = frw.round_id
    WHERE frw.awarded_at >= p_start AND frw.awarded_at <= p_end
      AND COALESCE(pf.test, false) = false
      AND COALESCE(fr.is_paid, false) = true
    GROUP BY frw.awarded_at::date
  ),
  daily_credits AS (
    SELECT frw.awarded_at::date AS d, COALESCE(SUM(frw.credits_awarded), 0) AS amt
    FROM fantasy_round_winners frw
    INNER JOIN profiles pf ON pf.id = frw.user_id
    INNER JOIN fantasy_rounds fr ON fr.id = frw.round_id
    WHERE frw.awarded_at >= p_start AND frw.awarded_at <= p_end
      AND COALESCE(pf.test, false) = false
      AND COALESCE(fr.is_paid, false) = false
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