-- Fix the spend_bonus_credits function to handle both base amount and bonus credits
CREATE OR REPLACE FUNCTION public.spend_bonus_credits(
  p_user uuid, 
  p_round uuid, 
  p_base_amount integer,
  p_bonus_amount integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  available_credits integer;
  remaining_to_spend integer := p_bonus_amount;
  bonus_record record;
BEGIN
  -- Check if user has enough bonus credits
  SELECT get_available_bonus_credits(p_user) INTO available_credits;
  
  IF available_credits < p_bonus_amount THEN
    RETURN false;
  END IF;
  
  -- Spend credits from oldest records first
  FOR bonus_record IN 
    SELECT id, available_amount 
    FROM user_bonus_credits 
    WHERE user_id = p_user AND available_amount > 0
    ORDER BY earned_at ASC
  LOOP
    IF remaining_to_spend <= 0 THEN
      EXIT;
    END IF;
    
    IF bonus_record.available_amount >= remaining_to_spend THEN
      -- This record can cover the remaining amount
      UPDATE user_bonus_credits 
      SET available_amount = available_amount - remaining_to_spend
      WHERE id = bonus_record.id;
      remaining_to_spend := 0;
    ELSE
      -- Use all of this record and continue
      remaining_to_spend := remaining_to_spend - bonus_record.available_amount;
      UPDATE user_bonus_credits 
      SET available_amount = 0
      WHERE id = bonus_record.id;
    END IF;
  END LOOP;
  
  -- Record both base amount and bonus credit spending for the round
  INSERT INTO round_credit_spend (user_id, round_id, amount, bonus_credits_used)
  VALUES (p_user, p_round, p_base_amount, p_bonus_amount)
  ON CONFLICT (user_id, round_id) 
  DO UPDATE SET 
    amount = round_credit_spend.amount + excluded.amount,
    bonus_credits_used = round_credit_spend.bonus_credits_used + excluded.bonus_credits_used;
  
  RETURN true;
END;
$function$