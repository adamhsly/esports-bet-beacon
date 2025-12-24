-- Create function to claim welcome bonus for new users (no spend requirement)
CREATE OR REPLACE FUNCTION public.claim_welcome_bonus(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward_pence integer := 1000; -- $10 in pence
  v_expiry_days integer := 30;
  v_existing_claim boolean;
  v_current_promo_balance integer;
BEGIN
  -- Check if user has already claimed the welcome bonus
  SELECT welcome_offer_claimed INTO v_existing_claim
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_existing_claim IS TRUE THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Welcome bonus already claimed'
    );
  END IF;
  
  -- Get current promo balance
  SELECT COALESCE(promo_balance_pence, 0) INTO v_current_promo_balance
  FROM profiles
  WHERE id = p_user_id;
  
  -- Award the bonus: update promo balance and mark as claimed
  UPDATE profiles
  SET 
    promo_balance_pence = COALESCE(promo_balance_pence, 0) + v_reward_pence,
    promo_expires_at = NOW() + (v_expiry_days || ' days')::interval,
    welcome_offer_claimed = true,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Record the transaction
  INSERT INTO credit_transactions (user_id, delta, kind, reason, ref_type)
  VALUES (p_user_id, v_reward_pence, 'promo', 'Welcome bonus - Free $10', 'welcome_bonus');
  
  RETURN json_build_object(
    'success', true,
    'promo_balance_pence', v_current_promo_balance + v_reward_pence,
    'expires_at', NOW() + (v_expiry_days || ' days')::interval
  );
END;
$$;