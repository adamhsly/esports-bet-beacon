-- Check for all views with SECURITY DEFINER and fix them
DO $$
DECLARE
    rec record;
BEGIN
    -- Find all views with SECURITY DEFINER in public schema
    FOR rec IN 
        SELECT schemaname, viewname, definition
        FROM pg_views 
        WHERE schemaname = 'public'
        AND definition ILIKE '%security definer%'
    LOOP
        -- Drop each problematic view
        EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', rec.schemaname, rec.viewname);
        RAISE NOTICE 'Dropped security definer view: %.%', rec.schemaname, rec.viewname;
    END LOOP;
END $$;

-- Also check for any functions with issues
SELECT schemaname, functionname 
FROM pg_stat_user_functions 
WHERE schemaname = 'public';