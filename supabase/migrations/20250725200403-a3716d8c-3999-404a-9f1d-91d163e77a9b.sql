-- Enable pg_cron extension if not already enabled
SELECT cron.schedule(
  'update-fantasy-round-status-hourly',
  '0 * * * *', -- every hour
  $$
  select
    net.http_post(
        url:='https://zcjzeafelunqxmxzznos.supabase.co/functions/v1/update-fantasy-round-status',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjanplYWZlbHVucXhteHp6bm9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NzE4MTgsImV4cCI6MjA2NDM0NzgxOH0.l0RObyMQCw23tmPfi5Wy7CgdmER93GYbR7IVPakzn-A"}'::jsonb
    ) as request_id;
  $$
);