-- Update deduct_promo_balance to use profiles.promo_balance_pence instead of user_promo_balance table
CREATE OR REPLACE FUNCTION public.deduct_promo_balance(p_user_id UUID, p_amount_pence INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_balance INTEGER;
  v_to_deduct INTEGER;
BEGIN
  -- Get current promo balance from profiles
  SELECT COALESCE(promo_balance_pence, 0) INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Calculate amount to deduct (can't deduct more than available)
  v_to_deduct := LEAST(v_current_balance, p_amount_pence);

  -- Deduct from profiles
  UPDATE profiles
  SET 
    promo_balance_pence = COALESCE(promo_balance_pence, 0) - v_to_deduct,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN v_to_deduct;
END;
$$;

-- Update get_welcome_offer_status to use profiles table as source of truth
CREATE OR REPLACE FUNCTION public.get_welcome_offer_status(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile RECORD;
  v_spending RECORD;
  v_threshold_pence INTEGER := 500; -- £5
  v_reward_pence INTEGER := 1000; -- £10
BEGIN
  -- Get profile data (primary source of truth for claimed status and balance)
  SELECT 
    COALESCE(welcome_offer_claimed, false) AS offer_claimed,
    COALESCE(promo_balance_pence, 0) AS promo_balance,
    promo_expires_at
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  -- Get spending record for tracking (legacy table)
  SELECT total_spent_pence INTO v_spending
  FROM user_welcome_spending
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'total_spent_pence', COALESCE(v_spending.total_spent_pence, 0),
    'threshold_pence', v_threshold_pence,
    'offer_claimed', COALESCE(v_profile.offer_claimed, false),
    'promo_balance_pence', COALESCE(v_profile.promo_balance, 0),
    'promo_expires_at', v_profile.promo_expires_at,
    'reward_pence', v_reward_pence
  );
END;
$$;