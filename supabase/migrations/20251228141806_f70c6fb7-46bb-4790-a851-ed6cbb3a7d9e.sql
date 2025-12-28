-- Update claim_welcome_bonus to use 2-day expiry for tier 2
CREATE OR REPLACE FUNCTION public.claim_welcome_bonus(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_tier INTEGER;
  v_promo_amount integer := 1000; -- $10.00 in pence
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
    CASE WHEN v_tier = 1 THEN 'Welcome bonus claimed' ELSE 'Spend $5 Get $10 bonus claimed' END,
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
$$;