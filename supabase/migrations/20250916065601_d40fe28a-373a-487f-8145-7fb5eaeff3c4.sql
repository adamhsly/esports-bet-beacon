-- Add bonus credit tracking to round spending
ALTER TABLE round_credit_spend 
ADD COLUMN bonus_credits_used INTEGER DEFAULT 0;

-- Create table to track bonus credit earnings from XP
CREATE TABLE user_bonus_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  earned_from TEXT NOT NULL, -- 'xp_reward', 'level_reward', etc.
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  available_amount INTEGER NOT NULL, -- remaining unused credits
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_bonus_credits
ALTER TABLE user_bonus_credits ENABLE ROW LEVEL SECURITY;

-- Create policies for user_bonus_credits
CREATE POLICY "Users can view their own bonus credits" 
ON user_bonus_credits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bonus credits" 
ON user_bonus_credits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bonus credits" 
ON user_bonus_credits 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Function to grant bonus credits from XP rewards
CREATE OR REPLACE FUNCTION grant_bonus_credits(p_user uuid, p_amount integer, p_source text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO user_bonus_credits (user_id, amount, earned_from, available_amount)
  VALUES (p_user, p_amount, p_source, p_amount);
END;
$$;

-- Function to get available bonus credits for a user
CREATE OR REPLACE FUNCTION get_available_bonus_credits(p_user uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_available integer;
BEGIN
  SELECT COALESCE(SUM(available_amount), 0) 
  INTO total_available
  FROM user_bonus_credits 
  WHERE user_id = p_user;
  
  RETURN total_available;
END;
$$;

-- Function to spend bonus credits for a round
CREATE OR REPLACE FUNCTION spend_bonus_credits(p_user uuid, p_round uuid, p_amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  available_credits integer;
  remaining_to_spend integer := p_amount;
  bonus_record record;
BEGIN
  -- Check if user has enough bonus credits
  SELECT get_available_bonus_credits(p_user) INTO available_credits;
  
  IF available_credits < p_amount THEN
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
  
  -- Record the bonus credit spending for the round
  INSERT INTO round_credit_spend (user_id, round_id, bonus_credits_used)
  VALUES (p_user, p_round, p_amount)
  ON CONFLICT (user_id, round_id) 
  DO UPDATE SET bonus_credits_used = round_credit_spend.bonus_credits_used + excluded.bonus_credits_used;
  
  RETURN true;
END;
$$;