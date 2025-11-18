-- Create function to trigger calculate-team-prices edge function when a new round is created
CREATE OR REPLACE FUNCTION trigger_calculate_team_prices()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Call the calculate-team-prices edge function asynchronously
  PERFORM net.http_post(
    url := 'https://zcjzeafelunqxmxzznos.supabase.co/functions/v1/calculate-team-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjanplYWZlbHVucXhteHp6bm9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NzE4MTgsImV4cCI6MjA2NDM0NzgxOH0.l0RObyMQCw23tmPfi5Wy7CgdmER93GYbR7IVPakzn-A'
    ),
    body := jsonb_build_object(
      'round_id', NEW.id::text,
      'PRO_MULTIPLIER', 1.2,
      'AMATEUR_MULTIPLIER', 0.9,
      'MIN_PRICE', 5,
      'MAX_PRICE', 20,
      'ABANDON_PENALTY_MULTIPLIER', 5
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to fire after new fantasy round is inserted
CREATE TRIGGER on_fantasy_round_created
AFTER INSERT ON fantasy_rounds
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_team_prices();