-- Setup cron job for match notifications
-- This cron job will run every minute and trigger the schedule-match-notifications edge function
SELECT cron.schedule(
  'send-match-notifications-every-minute',
  '* * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://zcjzeafelunqxmxzznos.supabase.co/functions/v1/schedule-match-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjanplYWZlbHVucXhteHp6bm9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc3MTgxOCwiZXhwIjoyMDY0MzQ3ODE4fQ.bqNt4rFH6VywxQXTQ8QQSAUgvQtcE-sWRh_Ob0OQ_20"}'::jsonb,
        body:=jsonb_build_object('time', now()::text)
    ) as request_id;
  $$
);