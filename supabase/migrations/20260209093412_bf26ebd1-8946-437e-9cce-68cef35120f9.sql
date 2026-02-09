-- Remove minimum_reservations threshold logic from the update_expired_fantasy_rounds function
-- Paid rounds will now open immediately when their start_date is reached, just like free rounds
CREATE OR REPLACE FUNCTION public.update_expired_fantasy_rounds()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  total_count integer := 0;
  temp_count integer := 0;
BEGIN
  -- Transition scheduled → open when start_date is reached (both free and paid rounds)
  UPDATE fantasy_rounds 
  SET status = 'open', updated_at = now()
  WHERE start_date <= now() 
    AND status = 'scheduled';
  
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