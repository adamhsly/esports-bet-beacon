-- Drop and recreate the claim_welcome_bonus function with correct ref_id handling
DROP FUNCTION IF EXISTS public.claim_welcome_bonus(uuid);

CREATE OR REPLACE FUNCTION public.claim_welcome_bonus(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_already_claimed boolean;
  v_promo_amount integer := 1000; -- $10.00 in pence
  v_expiry_days integer := 30;
  v_expiry_date timestamptz;
  v_next_round record;
BEGIN
  -- Check if already claimed
  SELECT welcome_offer_claimed INTO v_already_claimed
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_already_claimed IS TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Welcome bonus already claimed'
    );
  END IF;

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

  -- Record the transaction (use NULL for ref_id since it's not referencing another record)
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
    'Welcome bonus claimed',
    'welcome_offer',
    NULL
  );

  -- Find next available paid round to auto-enter
  SELECT id, round_name, entry_fee
  INTO v_next_round
  FROM public.fantasy_rounds
  WHERE is_paid = true
    AND status IN ('open', 'scheduled')
    AND start_date > now()
  ORDER BY start_date ASC
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'promo_balance_pence', v_promo_amount,
    'expires_at', v_expiry_date,
    'auto_entered_round_id', v_next_round.id,
    'round_name', v_next_round.round_name,
    'entry_fee', v_next_round.entry_fee
  );
END;
$$;