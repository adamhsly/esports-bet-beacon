
-- Update claim_welcome_bonus to give $1.50 (150 pence) for Tier 1
CREATE OR REPLACE FUNCTION public.claim_welcome_bonus(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD;
  v_tier INTEGER;
  v_promo_amount integer;
  v_expiry_days integer;
  v_expiry_date timestamptz;
  v_spending_pence INTEGER;
  v_threshold_pence INTEGER := 500; -- $5 for tier 2
BEGIN
  -- Get current profile state
  SELECT 
    welcome_offer_claimed,
    COALESCE(welcome_offer_tier, 1) AS tier
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  v_tier := COALESCE(v_profile.tier, 1);

  -- Set promo amount based on tier: $1.50 for tier 1, $10 for tier 2
  v_promo_amount := CASE WHEN v_tier = 1 THEN 150 ELSE 1000 END;

  -- Check if already claimed for current tier
  IF v_profile.welcome_offer_claimed IS TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Bonus already claimed for this tier'
    );
  END IF;

  -- For tier 2, check spending requirement
  IF v_tier = 2 THEN
    SELECT COALESCE(total_spent_pence, 0) INTO v_spending_pence
    FROM user_welcome_spending
    WHERE user_id = p_user_id;

    IF COALESCE(v_spending_pence, 0) < v_threshold_pence THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'You need to spend $5 on paid rounds to claim this bonus',
        'spent_pence', COALESCE(v_spending_pence, 0),
        'threshold_pence', v_threshold_pence
      );
    END IF;
  END IF;

  -- Set expiry days based on tier: 30 days for tier 1, 2 days for tier 2
  v_expiry_days := CASE WHEN v_tier = 2 THEN 2 ELSE 30 END;
  
  -- Calculate expiry date
  v_expiry_date := now() + (v_expiry_days || ' days')::interval;

  -- Update profile with promo balance
  UPDATE public.profiles
  SET 
    welcome_offer_claimed = true,
    promo_balance_pence = COALESCE(promo_balance_pence, 0) + v_promo_amount,
    promo_expires_at = v_expiry_date,
    updated_at = now()
  WHERE id = p_user_id;

  -- Record the transaction
  INSERT INTO public.credit_transactions (
    user_id,
    delta,
    kind,
    reason,
    ref_type,
    ref_id
  ) VALUES (
    p_user_id,
    v_promo_amount,
    'promo',
    CASE WHEN v_tier = 1 THEN 'Free paid entry claimed' ELSE 'Spend $5 Get $10 bonus claimed' END,
    'welcome_offer',
    NULL
  );

  RETURN jsonb_build_object(
    'success', true,
    'tier', v_tier,
    'promo_balance_pence', v_promo_amount,
    'expires_at', v_expiry_date
  );
END;
$function$;

-- Update get_welcome_offer_status to return tier-specific reward amounts
CREATE OR REPLACE FUNCTION public.get_welcome_offer_status(p_user_id uuid DEFAULT auth.uid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD;
  v_spending RECORD;
  v_tier INTEGER;
  v_tier2_threshold_pence INTEGER := 500; -- $5
  v_tier1_reward_pence INTEGER := 150; -- $1.50 (1 free paid entry)
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
$function$;
