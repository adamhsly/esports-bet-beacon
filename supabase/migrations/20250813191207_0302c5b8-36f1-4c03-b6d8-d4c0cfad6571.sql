-- Call calculate-team-prices for all open fantasy rounds
SELECT 
  net.http_post(
    url := 'https://zcjzeafelunqxmxzznos.supabase.co/functions/v1/calculate-team-prices',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjanplYWZlbHVucXhteHp6bm9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NzE4MTgsImV4cCI6MjA2NDM0NzgxOH0.l0RObyMQCw23tmPfi5Wy7CgdmER93GYbR7IVPakzn-A"}'::jsonb,
    body := json_build_object(
      'round_id', r.id,
      'pro_multiplier', 1.0,
      'amateur_multiplier', 1.0,
      'win_rate_weight', 0.4,
      'match_volume_weight', 0.6,
      'amateur_penalty', 0.1
    )::jsonb
  ) as request_id
FROM fantasy_rounds r 
WHERE r.status = 'open';