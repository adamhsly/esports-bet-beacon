-- Remove all scheduled cron jobs that were created by the application
-- This allows external cron management while keeping the functions available

-- Unschedule all cron jobs that may have been created by the application
DO $$
DECLARE
    job_name TEXT;
    job_names TEXT[] := ARRAY[
        'auto-match-status-updater',
        'midnight-master-sync', 
        'dynamic-cron-manager',
        'faceit_live_sync',
        'faceit_live_match_updates',
        'match-notifications-scheduler',
        'fantasy-round-status-updater',
        'daily-fantasy-round-manager',
        'weekly-fantasy-round-manager',
        'monthly-fantasy-round-manager'
    ];
BEGIN
    -- Enable pg_cron extension if not already enabled
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    
    -- Unschedule each job, ignoring errors if job doesn't exist
    FOREACH job_name IN ARRAY job_names
    LOOP
        BEGIN
            PERFORM cron.unschedule(job_name);
            RAISE NOTICE 'Unscheduled job: %', job_name;
        EXCEPTION 
            WHEN OTHERS THEN
                RAISE NOTICE 'Job % was not scheduled or already removed', job_name;
        END;
    END LOOP;
    
    -- Also remove any dynamically created match-specific cron jobs
    -- These would have been created with pattern like 'sync-match-{match_id}'
    BEGIN
        PERFORM cron.unschedule(jobname) 
        FROM cron.job 
        WHERE jobname LIKE 'sync-match-%' OR jobname LIKE 'faceit-match-%' OR jobname LIKE 'panda-match-%';
        RAISE NOTICE 'Removed dynamic match-specific cron jobs';
    EXCEPTION 
        WHEN OTHERS THEN
            RAISE NOTICE 'No dynamic match jobs found or error removing them';
    END;
END $$;