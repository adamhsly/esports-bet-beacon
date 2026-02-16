
CREATE OR REPLACE FUNCTION public.award_welcome_offer(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_spending RECORD;
  v_current_promo INTEGER;
BEGIN
  -- Get or create spending record
  INSERT INTO user_welcome_spending (user_id, total_spent_pence)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_spending
  FROM user_welcome_spending
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if already claimed
  IF v_spending.offer_claimed THEN
    RETURN false;
  END IF;

  -- Check threshold
  IF v_spending.total_spent_pence < 500 THEN
    RETURN false;
  END IF;

  -- Award the promo balance to user_promo_balance table (legacy, 7 days)
  INSERT INTO user_promo_balance (user_id, balance_pence, source, expires_at)
  VALUES (p_user_id, 1000, 'welcome_offer', now() + interval '7 days');

  -- ALSO sync to profiles.promo_balance_pence (used by checkout edge function)
  -- Add 1000 pence to existing balance, set 30 day expiry
  SELECT COALESCE(promo_balance_pence, 0) INTO v_current_promo
  FROM profiles WHERE id = p_user_id;

  UPDATE profiles
  SET
    promo_balance_pence = COALESCE(v_current_promo, 0) + 1000,
    promo_expires_at = now() + interval '30 days',
    welcome_offer_claimed = true,
    welcome_offer_tier = 2,
    updated_at = now()
  WHERE id = p_user_id;

  -- Mark offer as claimed
  UPDATE user_welcome_spending
  SET offer_claimed = true, offer_claimed_at = now(), updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$;
