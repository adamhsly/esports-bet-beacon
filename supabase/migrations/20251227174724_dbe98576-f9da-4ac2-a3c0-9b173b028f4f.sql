
-- Drop and recreate functions with correct parameter names and return columns

DROP FUNCTION IF EXISTS get_platform_period_stats(timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS get_platform_all_time_stats();

-- Period stats function with p_start parameter (no end date needed - always uses now())
CREATE OR REPLACE FUNCTION get_platform_period_stats(p_start timestamp with time zone)
RETURNS TABLE(
  new_users bigint,
  real_round_participants bigint,
  round_entry_real_revenue bigint,
  round_entry_bonus_used bigint,
  battle_pass_revenue bigint,
  successful_logins bigint,
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
    (SELECT COUNT(*) FROM profiles p 
     WHERE p.created_at >= p_start 
     AND (p.test IS NULL OR p.test = false))::bigint as new_users,
    
    -- Real round participants (excluding test accounts)
    (SELECT COUNT(DISTINCT frp.user_id) 
     FROM fantasy_round_picks frp 
     INNER JOIN profiles p ON p.id = frp.user_id
     WHERE frp.submitted_at >= p_start 
     AND (p.test IS NULL OR p.test = false))::bigint as real_round_participants,
    
    -- Round entry real revenue (paid entries, excluding test accounts)
    (SELECT COALESCE(SUM(fr.entry_fee), 0)
     FROM fantasy_round_picks frp
     INNER JOIN fantasy_rounds fr ON fr.id = frp.round_id
     INNER JOIN profiles p ON p.id = frp.user_id
     WHERE frp.submitted_at >= p_start
     AND fr.is_paid = true
     AND (p.test IS NULL OR p.test = false))::bigint as round_entry_real_revenue,
    
    -- Round entry bonus used (placeholder - would need payment tracking)
    0::bigint as round_entry_bonus_used,
    
    -- Battle pass revenue (placeholder - would need payment tracking)
    0::bigint as battle_pass_revenue,
    
    -- Successful logins (using last_login_at from profiles)
    (SELECT COUNT(*) FROM profiles p 
     WHERE p.last_login_at >= p_start 
     AND (p.test IS NULL OR p.test = false))::bigint as successful_logins,
    
    -- Voucher prizes paid (prize_type = 'voucher', excluding test accounts)
    (SELECT COALESCE(SUM(frw.credits_awarded), 0)
     FROM fantasy_round_winners frw
     INNER JOIN fantasy_rounds fr ON fr.id = frw.round_id
     INNER JOIN profiles p ON p.id = frw.user_id
     WHERE frw.awarded_at >= p_start
     AND fr.prize_type = 'voucher'
     AND (p.test IS NULL OR p.test = false))::bigint as voucher_prizes_paid,
    
    -- Credit prizes paid (prize_type != 'voucher' or null, excluding test accounts)
    (SELECT COALESCE(SUM(frw.credits_awarded), 0)
     FROM fantasy_round_winners frw
     INNER JOIN fantasy_rounds fr ON fr.id = frw.round_id
     INNER JOIN profiles p ON p.id = frw.user_id
     WHERE frw.awarded_at >= p_start
     AND (fr.prize_type IS NULL OR fr.prize_type != 'voucher')
     AND (p.test IS NULL OR p.test = false))::bigint as credit_prizes_paid;
END;
$$;

-- All-time stats function with correct column names
CREATE OR REPLACE FUNCTION get_platform_all_time_stats()
RETURNS TABLE(
  total_users bigint,
  total_real_users bigint,
  total_rounds bigint,
  total_real_revenue bigint,
  total_bonus_used bigint,
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
    -- Total users (all accounts)
    (SELECT COUNT(*) FROM profiles)::bigint as total_users,
    
    -- Total real users (excluding test accounts)
    (SELECT COUNT(*) FROM profiles p WHERE p.test IS NULL OR p.test = false)::bigint as total_real_users,
    
    -- Total rounds
    (SELECT COUNT(*) FROM fantasy_rounds)::bigint as total_rounds,
    
    -- Total real revenue from paid entries (excluding test accounts)
    (SELECT COALESCE(SUM(fr.entry_fee), 0)
     FROM fantasy_round_picks frp
     INNER JOIN fantasy_rounds fr ON fr.id = frp.round_id
     INNER JOIN profiles p ON p.id = frp.user_id
     WHERE fr.is_paid = true
     AND (p.test IS NULL OR p.test = false))::bigint as total_real_revenue,
    
    -- Total bonus used (placeholder)
    0::bigint as total_bonus_used,
    
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
