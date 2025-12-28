
-- Fix get_platform_period_stats to properly calculate voucher prizes from fantasy_round_winners
CREATE OR REPLACE FUNCTION public.get_platform_period_stats(p_start timestamptz)
RETURNS TABLE (
  new_users bigint,
  real_round_participants bigint,
  round_entry_real_revenue bigint,
  round_entry_bonus_used bigint,
  free_round_entries bigint,
  paid_round_entries bigint,
  voucher_prizes_paid bigint,
  credit_prizes_paid bigint
)
LANGUAGE sql
SECURITY DEFINER
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

    -- Free round entries in period
    (SELECT COUNT(*)
     FROM fantasy_round_picks frp
     INNER JOIN profiles p ON p.id = frp.user_id
     INNER JOIN fantasy_rounds fr ON fr.id = frp.round_id
     WHERE frp.created_at >= p_start
     AND (p.test IS NULL OR p.test = false)
     AND (fr.is_paid IS NULL OR fr.is_paid = false))::bigint as free_round_entries,

    -- Paid round entries in period
    (SELECT COUNT(*)
     FROM round_entries re
     INNER JOIN profiles p ON p.id = re.user_id
     WHERE re.status = 'completed'
     AND re.paid_at >= p_start
     AND (p.test IS NULL OR p.test = false))::bigint as paid_round_entries,

    -- Voucher prizes paid out (calculated from fantasy_round_winners with prize_type = 'vouchers')
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
     WHERE frw.awarded_at >= p_start
     AND fr.prize_type = 'vouchers'
     AND (p.test IS NULL OR p.test = false))::bigint as voucher_prizes_paid,

    -- Credit prizes paid to real users (only for credit prize rounds)
    (SELECT COALESCE(SUM(frw.credits_awarded), 0)
     FROM fantasy_round_winners frw
     INNER JOIN fantasy_rounds fr ON fr.id = frw.round_id
     INNER JOIN profiles p ON p.id = frw.user_id
     WHERE frw.awarded_at >= p_start
     AND (fr.prize_type IS NULL OR fr.prize_type = 'credits')
     AND (p.test IS NULL OR p.test = false))::bigint as credit_prizes_paid;
$$;
