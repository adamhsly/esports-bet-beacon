-- Remove any prior version of this job
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'pickems-auto-slates-every-30min';

-- Schedule auto slate creation/locking every 30 minutes
SELECT cron.schedule(
  'pickems-auto-slates-every-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zcjzeafelunqxmxzznos.supabase.co/functions/v1/pickems-auto-slates',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjanplYWZlbHVucXhteHp6bm9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NzE4MTgsImV4cCI6MjA2NDM0NzgxOH0.l0RObyMQCw23tmPfi5Wy7CgdmER93GYbR7IVPakzn-A"}'::jsonb,
    body := jsonb_build_object('triggered_at', now())
  ) AS request_id;
  $$
);