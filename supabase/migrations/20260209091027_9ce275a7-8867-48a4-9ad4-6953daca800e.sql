-- Fix the update_expired_fantasy_rounds function to check both picks AND reservations
CREATE OR REPLACE FUNCTION public.update_expired_fantasy_rounds()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  total_count integer := 0;
  temp_count integer := 0;
BEGIN
  -- Transition scheduled → open for FREE rounds when start_date is reached
  UPDATE fantasy_rounds 
  SET status = 'open', updated_at = now()
  WHERE start_date <= now() 
    AND status = 'scheduled'
    AND (is_paid = false OR is_paid IS NULL);
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  total_count := total_count + temp_count;
  
  -- For PAID rounds: open if minimum participants are met (counting BOTH picks AND reservations)
  UPDATE fantasy_rounds fr
  SET status = 'open', updated_at = now()
  WHERE fr.start_date <= now() 
    AND fr.status = 'scheduled'
    AND fr.is_paid = true
    AND (
      fr.minimum_reservations IS NULL 
      OR (
        -- Count unique users who either have picks OR reservations
        (SELECT COUNT(DISTINCT user_id) FROM (
          SELECT user_id FROM fantasy_round_picks WHERE round_id = fr.id
          UNION
          SELECT user_id FROM round_reservations WHERE round_id = fr.id
        ) combined) >= fr.minimum_reservations
      )
    );
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  total_count := total_count + temp_count;
  
  -- For PAID rounds: set to 'cancelled' if start_date passed but minimum NOT met
  -- Changed from 'finished' to 'cancelled' for clarity
  UPDATE fantasy_rounds fr
  SET status = 'cancelled', updated_at = now()
  WHERE fr.start_date <= now() 
    AND fr.status = 'scheduled'
    AND fr.is_paid = true
    AND fr.minimum_reservations IS NOT NULL
    AND (
      SELECT COUNT(DISTINCT user_id) FROM (
        SELECT user_id FROM fantasy_round_picks WHERE round_id = fr.id
        UNION
        SELECT user_id FROM round_reservations WHERE round_id = fr.id
      ) combined
    ) < fr.minimum_reservations;
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  total_count := total_count + temp_count;
  
  -- Transition open → closed when end_date is reached
  UPDATE fantasy_rounds 
  SET status = 'closed', updated_at = now()
  WHERE end_date <= now() 
    AND status IN ('open', 'active');
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  total_count := total_count + temp_count;
  
  RETURN total_count;
END;
$$;