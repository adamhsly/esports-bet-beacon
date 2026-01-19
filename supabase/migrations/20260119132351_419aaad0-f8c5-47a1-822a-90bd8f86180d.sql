
-- First drop the existing function
DROP FUNCTION IF EXISTS public.award_round_winners(uuid);

-- Recreate with fixed ambiguous column references using table aliases
CREATE OR REPLACE FUNCTION public.award_round_winners(p_round_id uuid)
RETURNS TABLE(
  user_id uuid,
  finish_position integer,
  total_score integer,
  credits_awarded integer,
  email text,
  username text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner RECORD;
  v_round RECORD;
  v_position INTEGER := 0;
  v_credits INTEGER;
BEGIN
  -- Fetch round configuration for prize amounts
  SELECT 
    COALESCE(fr.prize_1st, 200) as prize_1st,
    COALESCE(fr.prize_2nd, 100) as prize_2nd,
    COALESCE(fr.prize_3rd, 50) as prize_3rd
  INTO v_round
  FROM fantasy_rounds fr
  WHERE fr.id = p_round_id;

  -- Get top 3 finishers from the round
  FOR v_winner IN
    SELECT 
      frp.user_id,
      frp.total_score,
      au.email,
      COALESCE(p.username, p.full_name, 'Player') as username
    FROM fantasy_round_picks frp
    LEFT JOIN profiles p ON p.id = frp.user_id
    LEFT JOIN auth.users au ON au.id = frp.user_id
    WHERE frp.round_id = p_round_id
    ORDER BY frp.total_score DESC
    LIMIT 3
  LOOP
    v_position := v_position + 1;
    
    -- Determine credits based on position using round config
    v_credits := CASE v_position
      WHEN 1 THEN v_round.prize_1st
      WHEN 2 THEN v_round.prize_2nd
      WHEN 3 THEN v_round.prize_3rd
      ELSE 0
    END;
    
    -- Skip if already awarded (idempotency) - use table alias to avoid ambiguity
    IF EXISTS (
      SELECT 1 FROM fantasy_round_winners frw
      WHERE frw.round_id = p_round_id AND frw.user_id = v_winner.user_id
    ) THEN
      CONTINUE;
    END IF;
    
    -- Grant bonus credits
    PERFORM grant_bonus_credits(
      v_winner.user_id,
      v_credits,
      'round_winner'
    );
    
    -- Record the win
    INSERT INTO fantasy_round_winners (
      round_id,
      user_id,
      finish_position,
      total_score,
      credits_awarded
    ) VALUES (
      p_round_id,
      v_winner.user_id,
      v_position,
      v_winner.total_score,
      v_credits
    );
    
    -- Return data for email notifications
    RETURN QUERY SELECT 
      v_winner.user_id,
      v_position,
      v_winner.total_score,
      v_credits,
      v_winner.email,
      v_winner.username;
  END LOOP;
END;
$$;
