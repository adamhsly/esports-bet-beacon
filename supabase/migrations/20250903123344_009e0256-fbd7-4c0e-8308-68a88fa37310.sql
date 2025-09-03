-- Unschedule fantasy-related cron jobs without touching extensions
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Try explicit known job names first (ignore errors if not found)
  BEGIN PERFORM cron.unschedule('daily-fantasy-round-manager'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('weekly-fantasy-round-manager'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('monthly-fantasy-round-manager'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('fantasy-round-status-updater'); EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Unschedule any remaining jobs that reference fantasy management in their name or command
  FOR r IN
    SELECT jobname
    FROM cron.job
    WHERE jobname ILIKE '%fantasy%'
       OR command ILIKE '%manage-fantasy-rounds%'
       OR command ILIKE '%manage-weekly-fantasy-rounds%'
       OR command ILIKE '%manage-monthly-fantasy-rounds%'
       OR command ILIKE '%update-fantasy-round-status%'
  LOOP
    BEGIN
      PERFORM cron.unschedule(r.jobname);
    EXCEPTION WHEN OTHERS THEN
      -- Ignore errors for jobs already removed
      NULL;
    END;
  END LOOP;
END $$;