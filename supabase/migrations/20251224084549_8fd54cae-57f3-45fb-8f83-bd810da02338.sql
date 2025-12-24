-- Update claim_welcome_bonus to also auto-enter user into next paid daily round
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
  v_next_round record;
  v_entry_fee integer;
  v_new_promo_balance integer;
  v_picks_id uuid;
  v_session_id text;
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
  
  -- Find the next paid daily pro round that's scheduled or open
  SELECT id, entry_fee, round_name, start_date, end_date
  INTO v_next_round
  FROM fantasy_rounds
  WHERE type = 'daily'
    AND is_paid = true
    AND is_private = false
    AND team_type = 'pro'
    AND status IN ('scheduled', 'open')
    AND entry_fee IS NOT NULL
    AND entry_fee > 0
  ORDER BY start_date ASC
  LIMIT 1;
  
  -- Calculate new balance after reward
  v_new_promo_balance := v_current_promo_balance + v_reward_pence;
  
  -- Award the bonus: update promo balance and mark as claimed
  UPDATE profiles
  SET 
    promo_balance_pence = v_new_promo_balance,
    promo_expires_at = NOW() + (v_expiry_days || ' days')::interval,
    welcome_offer_claimed = true,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Record the credit transaction for the bonus
  INSERT INTO credit_transactions (user_id, delta, kind, reason, ref_type)
  VALUES (p_user_id, v_reward_pence, 'promo', 'Welcome bonus - Free $10', 'welcome_bonus');
  
  -- If we found a paid round, auto-enter the user
  IF v_next_round.id IS NOT NULL THEN
    v_entry_fee := v_next_round.entry_fee;
    
    -- Check if user has enough promo balance for the entry
    IF v_new_promo_balance >= v_entry_fee THEN
      v_session_id := 'welcome_' || gen_random_uuid()::text;
      
      -- Create picks entry
      INSERT INTO fantasy_round_picks (round_id, user_id, team_picks)
      VALUES (v_next_round.id, p_user_id, '[]'::jsonb)
      RETURNING id INTO v_picks_id;
      
      -- Create round entry record
      INSERT INTO round_entries (round_id, user_id, stripe_session_id, amount_paid, promo_used, status, paid_at, pick_id)
      VALUES (v_next_round.id, p_user_id, v_session_id, v_entry_fee, v_entry_fee, 'completed', NOW(), v_picks_id);
      
      -- Deduct entry fee from promo balance
      UPDATE profiles
      SET promo_balance_pence = promo_balance_pence - v_entry_fee,
          updated_at = NOW()
      WHERE id = p_user_id;
      
      -- Record the deduction transaction
      INSERT INTO credit_transactions (user_id, delta, kind, reason, ref_type, ref_id)
      VALUES (p_user_id, -v_entry_fee, 'promo', 'Welcome bonus auto-entry: ' || COALESCE(v_next_round.round_name, 'Daily Pro'), 'round_entry', v_next_round.id::text);
      
      RETURN json_build_object(
        'success', true,
        'promo_balance_pence', v_new_promo_balance - v_entry_fee,
        'expires_at', NOW() + (v_expiry_days || ' days')::interval,
        'auto_entered_round_id', v_next_round.id,
        'round_name', v_next_round.round_name,
        'entry_fee_used', v_entry_fee
      );
    END IF;
  END IF;
  
  -- Return without auto-entry if no suitable round or insufficient balance
  RETURN json_build_object(
    'success', true,
    'promo_balance_pence', v_new_promo_balance,
    'expires_at', NOW() + (v_expiry_days || ' days')::interval,
    'auto_entered_round_id', null
  );
END;
$$;