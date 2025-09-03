-- Unschedule any fantasy-related cron jobs to stop automatic round management
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Ensure pg_cron is available
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  -- Explicitly unschedule by common fantasy job names if present
  PERFORM cron.unschedule('daily-fantasy-round-manager');
  PERFORM cron.unschedule('weekly-fantasy-round-manager');
  PERFORM cron.unschedule('monthly-fantasy-round-manager');
  PERFORM cron.unschedule('fantasy-round-status-updater');

  -- Also unschedule any jobs whose name or command references fantasy functions
  FOR r IN
    SELECT jobname, command
    FROM cron.job
    WHERE jobname ILIKE '%fantasy%'
       OR command ILIKE '%fantasy%'
       OR command ILIKE '%manage-fantasy-rounds%'
       OR command ILIKE '%manage-weekly-fantasy-rounds%'
       OR command ILIKE '%manage-monthly-fantasy-rounds%'
       OR command ILIKE '%update-fantasy-round-status%'
  LOOP
    BEGIN
      PERFORM cron.unschedule(r.jobname);
      RAISE NOTICE 'Unscheduled fantasy-related cron job: %', r.jobname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not unschedule job: % (may already be removed)', r.jobname;
    END;
  END LOOP;
END $$;