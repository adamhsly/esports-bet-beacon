-- Drop and recreate the claim_welcome_bonus function with 30 day expiry for both tiers
DROP FUNCTION IF EXISTS public.claim_welcome_bonus(uuid);

CREATE OR REPLACE FUNCTION public.claim_welcome_bonus(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_promo INTEGER;
  v_current_expires TIMESTAMPTZ;
  v_new_promo_balance INTEGER;
  v_reward_pence INTEGER;
  v_tier INTEGER;
  v_expiry_days INTEGER;
  v_total_spent INTEGER;
  v_threshold_pence INTEGER := 500; -- £5 threshold for tier 2
BEGIN
  -- Get current promo balance and expiry
  SELECT COALESCE(promo_balance_pence, 0), promo_expires_at
  INTO v_current_promo, v_current_expires
  FROM profiles
  WHERE id = p_user_id;

  -- If promo balance exists and hasn't expired, user has already claimed tier 1
  IF v_current_promo > 0 AND (v_current_expires IS NULL OR v_current_expires > NOW()) THEN
    -- Check if they qualify for tier 2 (spent >= £5)
    SELECT COALESCE(SUM(entry_fee), 0) INTO v_total_spent
    FROM fantasy_round_picks frp
    JOIN fantasy_rounds fr ON frp.round_id = fr.id
    WHERE frp.user_id = p_user_id
    AND fr.is_paid = true;

    IF v_total_spent >= v_threshold_pence THEN
      v_tier := 2;
      v_reward_pence := 1000; -- £10 reward for tier 2
    ELSE
      -- Already has tier 1 but hasn't spent enough for tier 2
      RETURN json_build_object(
        'success', false,
        'error', 'Already claimed tier 1. Spend £5 to unlock tier 2.',
        'tier', 1,
        'spent_pence', v_total_spent,
        'threshold_pence', v_threshold_pence
      );
    END IF;
  ELSE
    -- First time claiming - tier 1
    v_tier := 1;
    v_reward_pence := 500; -- £5 equivalent for free entry
  END IF;

  -- Set expiry days: 30 days for both tiers
  v_expiry_days := 30;
  
  -- Calculate new promo balance (add to existing if any)
  v_new_promo_balance := COALESCE(v_current_promo, 0) + v_reward_pence;

  -- Update profile with new promo balance
  UPDATE profiles
  SET 
    promo_balance_pence = v_new_promo_balance,
    promo_expires_at = NOW() + (v_expiry_days || ' days')::interval,
    welcome_offer_claimed = true,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'tier', v_tier,
    'reward_pence', v_reward_pence,
    'new_balance_pence', v_new_promo_balance,
    'expires_at', NOW() + (v_expiry_days || ' days')::interval
  );
END;
$$;