-- First, let's fix the existing daily round to use proper 9am-to-9am timing
-- Today is 2025-07-24, so current daily round should be from 2025-07-24 09:00:00+00 to 2025-07-25 09:00:00+00

UPDATE fantasy_rounds 
SET 
  start_date = '2025-07-24 09:00:00+00',
  end_date = '2025-07-25 09:00:00+00',
  updated_at = now()
WHERE type = 'daily' 
  AND id = 'ff46a0b1-43ed-4957-a19d-4de192a9b3ed';

-- Also create a cron job to automatically manage fantasy rounds
-- This will run every hour to close finished rounds and create new ones
SELECT cron.schedule(
  'manage-fantasy-rounds',
  '0 * * * *', -- every hour
  $$
  SELECT
    net.http_post(
        url:='https://zcjzeafelunqxmxzznos.supabase.co/functions/v1/manage-fantasy-rounds',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjanplYWZlbHVucXhteHp6bm9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NzE4MTgsImV4cCI6MjA2NDM0NzgxOH0.l0RObyMQCw23tmPfi5Wy7CgdmER93GYbR7IVPakzn-A"}'::jsonb,
        body:='{"action": "close_finished_rounds"}'::jsonb
    ) as request_id;
  $$
);

-- Also schedule daily round creation at 9am each day
SELECT cron.schedule(
  'create-daily-fantasy-rounds',
  '0 9 * * *', -- every day at 9am
  $$
  SELECT
    net.http_post(
        url:='https://zcjzeafelunqxmxzznos.supabase.co/functions/v1/manage-fantasy-rounds',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjanplYWZlbHVucXhteHp6bm9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NzE4MTgsImV4cCI6MjA2NDM0NzgxOH0.l0RObyMQCw23tmPfi5Wy7CgdmER93GYbR7IVPakzn-A"}'::jsonb,
        body:='{"action": "create_next_daily"}'::jsonb
    ) as request_id;
  $$
);