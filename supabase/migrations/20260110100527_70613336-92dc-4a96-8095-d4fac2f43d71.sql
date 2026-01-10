-- Drop and recreate the get_welcome_offer_status function with updated tier 1 reward
DROP FUNCTION IF EXISTS get_welcome_offer_status(uuid);

CREATE FUNCTION get_welcome_offer_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_spending RECORD;
  v_tier INTEGER;
  v_tier2_threshold_pence INTEGER := 500; -- $5
  v_tier1_reward_pence INTEGER := 500; -- $5.00 (covers any paid round entry)
  v_tier2_reward_pence INTEGER := 1000; -- $10
  v_is_tier1_complete BOOLEAN;
BEGIN
  -- Get profile data
  SELECT 
    COALESCE(welcome_offer_claimed, false) AS tier1_claimed,
    COALESCE(promo_balance_pence, 0) AS promo_balance,
    promo_expires_at,
    COALESCE(welcome_offer_tier, 1) AS current_tier
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  -- Get spending record for tier 2 tracking
  SELECT total_spent_pence INTO v_spending
  FROM user_welcome_spending
  WHERE user_id = p_user_id;

  -- Determine current tier and if tier 1 is complete
  v_tier := COALESCE(v_profile.current_tier, 1);
  
  -- Tier 1 is complete if:
  -- 1. They claimed the bonus AND
  -- 2. Either promo balance is 0 OR promo has expired
  v_is_tier1_complete := v_profile.tier1_claimed AND (
    v_profile.promo_balance = 0 OR 
    (v_profile.promo_expires_at IS NOT NULL AND v_profile.promo_expires_at < NOW())
  );

  -- Auto-upgrade to tier 2 if tier 1 is complete and still on tier 1
  IF v_is_tier1_complete AND v_tier = 1 THEN
    UPDATE profiles SET welcome_offer_tier = 2 WHERE id = p_user_id;
    v_tier := 2;
    
    -- Reset welcome_offer_claimed for tier 2 (they can claim again after spending $5)
    UPDATE profiles SET welcome_offer_claimed = false WHERE id = p_user_id;
    
    -- Reset their spending tracker for tier 2
    DELETE FROM user_welcome_spending WHERE user_id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'tier', v_tier,
    'total_spent_pence', COALESCE(v_spending.total_spent_pence, 0),
    'threshold_pence', CASE WHEN v_tier = 1 THEN 0 ELSE v_tier2_threshold_pence END,
    'offer_claimed', COALESCE(v_profile.tier1_claimed, false),
    'promo_balance_pence', COALESCE(v_profile.promo_balance, 0),
    'promo_expires_at', v_profile.promo_expires_at,
    'reward_pence', CASE WHEN v_tier = 1 THEN v_tier1_reward_pence ELSE v_tier2_reward_pence END,
    'tier1_complete', v_is_tier1_complete
  );
END;
$$;