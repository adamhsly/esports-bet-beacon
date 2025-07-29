-- Trigger immediate sync for live matches
SELECT net.http_post(
  url:='https://zcjzeafelunqxmxzznos.supabase.co/functions/v1/sync-faceit-live',
  headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjanplYWZlbHVucXhteHp6bm9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc3MTgxOCwiZXhwIjoyMDY0MzQ3ODE4fQ.zm_NSyPSPYukU-Vu9SZWDLsPWykylZgLEM9_DTjitOA"}'::jsonb,
  body:='{"games": ["cs2", "dota2"]}'::jsonb
) as manual_sync_trigger;