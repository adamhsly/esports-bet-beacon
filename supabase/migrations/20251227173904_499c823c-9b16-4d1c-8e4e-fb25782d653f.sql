-- Drop and recreate functions to exclude test accounts from platform stats

DROP FUNCTION IF EXISTS public.get_platform_period_stats(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_platform_all_time_stats();

-- Recreate get_platform_period_stats excluding test accounts
CREATE OR REPLACE FUNCTION public.get_platform_period_stats(
  period_start timestamptz,
  period_end timestamptz
)
RETURNS TABLE (
  new_users bigint,
  round_participants bigint,
  paid_entries bigint,
  revenue_pence bigint,
  voucher_prizes_paid bigint,
  credit_prizes_paid bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT
    -- New users (excluding test accounts)
    (SELECT COUNT(*) FROM profiles p WHERE p.created_at >= period_start AND p.created_at < period_end AND (p.test IS NULL OR p.test = false))::bigint as new_users,
    
    -- Round participants (excluding test accounts)
    (SELECT COUNT(DISTINCT frp.user_id) 
     FROM fantasy_round_picks frp 
     INNER JOIN profiles p ON p.id = frp.user_id
     WHERE frp.submitted_at >= period_start AND frp.submitted_at < period_end 
     AND (p.test IS NULL OR p.test = false))::bigint as round_participants,
    
    -- Paid entries (excluding test accounts)
    (SELECT COUNT(*) 
     FROM fantasy_round_picks frp
     INNER JOIN fantasy_rounds fr ON fr.id = frp.round_id
     INNER JOIN profiles p ON p.id = frp.user_id
     WHERE frp.submitted_at >= period_start AND frp.submitted_at < period_end
     AND fr.is_paid = true
     AND (p.test IS NULL OR p.test = false))::bigint as paid_entries,
    
    -- Revenue (excluding test accounts)
    (SELECT COALESCE(SUM(fr.entry_fee), 0)
     FROM fantasy_round_picks frp
     INNER JOIN fantasy_rounds fr ON fr.id = frp.round_id
     INNER JOIN profiles p ON p.id = frp.user_id
     WHERE frp.submitted_at >= period_start AND frp.submitted_at < period_end
     AND fr.is_paid = true
     AND (p.test IS NULL OR p.test = false))::bigint as revenue_pence,
    
    -- Voucher prizes paid (credits with prize_type = 'voucher', excluding test accounts)
    (SELECT COALESCE(SUM(frw.credits_awarded), 0)
     FROM fantasy_round_winners frw
     INNER JOIN fantasy_rounds fr ON fr.id = frw.round_id
     INNER JOIN profiles p ON p.id = frw.user_id
     WHERE frw.awarded_at >= period_start AND frw.awarded_at < period_end
     AND fr.prize_type = 'voucher'
     AND (p.test IS NULL OR p.test = false))::bigint as voucher_prizes_paid,
    
    -- Credit prizes paid (credits with prize_type != 'voucher' or null, excluding test accounts)
    (SELECT COALESCE(SUM(frw.credits_awarded), 0)
     FROM fantasy_round_winners frw
     INNER JOIN fantasy_rounds fr ON fr.id = frw.round_id
     INNER JOIN profiles p ON p.id = frw.user_id
     WHERE frw.awarded_at >= period_start AND frw.awarded_at < period_end
     AND (fr.prize_type IS NULL OR fr.prize_type != 'voucher')
     AND (p.test IS NULL OR p.test = false))::bigint as credit_prizes_paid;
END;
$$;

-- Recreate get_platform_all_time_stats excluding test accounts
CREATE OR REPLACE FUNCTION public.get_platform_all_time_stats()
RETURNS TABLE (
  total_users bigint,
  total_round_participants bigint,
  total_paid_entries bigint,
  total_revenue_pence bigint,
  total_voucher_prizes_paid bigint,
  total_credit_prizes_paid bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT
    -- Total users (excluding test accounts)
    (SELECT COUNT(*) FROM profiles p WHERE p.test IS NULL OR p.test = false)::bigint as total_users,
    
    -- Total round participants (excluding test accounts)
    (SELECT COUNT(DISTINCT frp.user_id) 
     FROM fantasy_round_picks frp
     INNER JOIN profiles p ON p.id = frp.user_id
     WHERE p.test IS NULL OR p.test = false)::bigint as total_round_participants,
    
    -- Total paid entries (excluding test accounts)
    (SELECT COUNT(*) 
     FROM fantasy_round_picks frp
     INNER JOIN fantasy_rounds fr ON fr.id = frp.round_id
     INNER JOIN profiles p ON p.id = frp.user_id
     WHERE fr.is_paid = true
     AND (p.test IS NULL OR p.test = false))::bigint as total_paid_entries,
    
    -- Total revenue (excluding test accounts)
    (SELECT COALESCE(SUM(fr.entry_fee), 0)
     FROM fantasy_round_picks frp
     INNER JOIN fantasy_rounds fr ON fr.id = frp.round_id
     INNER JOIN profiles p ON p.id = frp.user_id
     WHERE fr.is_paid = true
     AND (p.test IS NULL OR p.test = false))::bigint as total_revenue_pence,
    
    -- Total voucher prizes paid (excluding test accounts)
    (SELECT COALESCE(SUM(frw.credits_awarded), 0)
     FROM fantasy_round_winners frw
     INNER JOIN fantasy_rounds fr ON fr.id = frw.round_id
     INNER JOIN profiles p ON p.id = frw.user_id
     WHERE fr.prize_type = 'voucher'
     AND (p.test IS NULL OR p.test = false))::bigint as total_voucher_prizes_paid,
    
    -- Total credit prizes paid (excluding test accounts)
    (SELECT COALESCE(SUM(frw.credits_awarded), 0)
     FROM fantasy_round_winners frw
     INNER JOIN fantasy_rounds fr ON fr.id = frw.round_id
     INNER JOIN profiles p ON p.id = frw.user_id
     WHERE (fr.prize_type IS NULL OR fr.prize_type != 'voucher')
     AND (p.test IS NULL OR p.test = false))::bigint as total_credit_prizes_paid;
END;
$$;