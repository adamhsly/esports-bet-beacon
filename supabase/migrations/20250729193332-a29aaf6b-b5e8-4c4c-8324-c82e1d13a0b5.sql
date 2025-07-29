-- Set up cron job for FACEIT live data sync
SELECT cron.schedule(
  'faceit-live-sync',
  '*/30 * * * *', -- every 30 seconds
  $$
  SELECT net.http_post(
    url:='https://zcjzeafelunqxmxzznos.supabase.co/functions/v1/sync-faceit-live',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjanplYWZlbHVucXhteHp6bm9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc3MTgxOCwiZXhwIjoyMDY0MzQ3ODE4fQ.zm_NSyPSPYukU-Vu9SZWDLsPWykylZgLEM9_DTjitOA"}'::jsonb,
    body:='{"games": ["cs2", "dota2"]}'::jsonb
  ) as request_id;
  $$
);

-- Set up cron job for individual live match updates  
SELECT cron.schedule(
  'faceit-live-match-updates',
  '*/15 * * * *', -- every 15 seconds
  $$
  DO $job$
  DECLARE
    live_match_record RECORD;
  BEGIN
    -- Loop through live matches and sync them individually
    FOR live_match_record IN 
      SELECT match_id 
      FROM faceit_matches 
      WHERE status IN ('ongoing', 'live', 'LIVE', 'ONGOING')
      LIMIT 5
    LOOP
      PERFORM net.http_post(
        url:='https://zcjzeafelunqxmxzznos.supabase.co/functions/v1/sync-faceit-live-match',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjanplYWZlbHVucXhteHp6bm9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc3MTgxOCwiZXhwIjoyMDY0MzQ3ODE4fQ.zm_NSyPSPYukU-Vu9SZWDLsPWykylZgLEM9_DTjitOA"}'::jsonb,
        body:=('{"matchId": "' || live_match_record.match_id || '"}')::jsonb
      );
    END LOOP;
  END $job$;
  $$
);