
-- Update the function to handle paid rounds with minimum reservation thresholds
CREATE OR REPLACE FUNCTION update_expired_fantasy_rounds()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
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
  
  -- For PAID rounds: only open if minimum reservations are met
  UPDATE fantasy_rounds fr
  SET status = 'open', updated_at = now()
  WHERE fr.start_date <= now() 
    AND fr.status = 'scheduled'
    AND fr.is_paid = true
    AND (
      fr.minimum_reservations IS NULL 
      OR (SELECT COUNT(*) FROM round_reservations rr WHERE rr.round_id = fr.id) >= fr.minimum_reservations
    );
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  total_count := total_count + temp_count;
  
  -- For PAID rounds: cancel if start_date passed but minimum NOT met
  -- These will be rolled over by the weekly round creation function
  UPDATE fantasy_rounds fr
  SET status = 'cancelled', updated_at = now()
  WHERE fr.start_date <= now() 
    AND fr.status = 'scheduled'
    AND fr.is_paid = true
    AND fr.minimum_reservations IS NOT NULL
    AND (SELECT COUNT(*) FROM round_reservations rr WHERE rr.round_id = fr.id) < fr.minimum_reservations;
  
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
