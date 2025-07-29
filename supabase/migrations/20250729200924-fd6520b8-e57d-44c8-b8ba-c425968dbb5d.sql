-- Trigger individual match sync for the live match
SELECT net.http_post(
  url:='https://zcjzeafelunqxmxzznos.supabase.co/functions/v1/sync-faceit-live-match',
  headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjanplYWZlbHVucXhteHp6bm9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc3MTgxOCwiZXhwIjoyMDY0MzQ3ODE4fQ.zm_NSyPSPYukU-Vu9SZWDLsPWykylZgLEM9_DTjitOA"}'::jsonb,
  body:='{"matchId": "1-e3fd4612-ea62-4f4a-8e4b-2e1fa068c182"}'::jsonb
) as match_sync_trigger;