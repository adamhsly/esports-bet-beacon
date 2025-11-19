-- Update the function to change status to 'closed' instead of 'finished'
CREATE OR REPLACE FUNCTION public.update_expired_fantasy_rounds()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  rows_updated integer;
BEGIN
  -- Update rounds that have ended to 'closed' status
  UPDATE fantasy_rounds 
  SET status = 'closed', updated_at = now()
  WHERE end_date <= now() 
    AND status IN ('open', 'active');
    
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$function$;