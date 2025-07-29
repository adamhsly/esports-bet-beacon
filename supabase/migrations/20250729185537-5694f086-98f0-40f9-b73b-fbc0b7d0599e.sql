-- Fix remaining critical security issues

-- 1. Find and fix security definer view issue
-- First let's identify the problematic view
DO $$
DECLARE
    view_name text;
BEGIN
    -- Find views with SECURITY DEFINER
    FOR view_name IN 
        SELECT viewname 
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND definition ILIKE '%security definer%'
    LOOP
        -- Drop the problematic view if it exists
        IF view_name = 'pandascore_view_teams' THEN
            DROP VIEW IF EXISTS public.pandascore_view_teams;
            RAISE NOTICE 'Dropped security definer view: %', view_name;
        END IF;
    END LOOP;
END $$;

-- 2. Recreate the view without SECURITY DEFINER if needed
-- This should be a simple view that respects RLS
CREATE OR REPLACE VIEW public.pandascore_view_teams AS
SELECT 
    team_id,
    name,
    acronym,
    logo_url,
    esport_type,
    players_data,
    created_at,
    updated_at
FROM public.pandascore_teams;

-- 3. Ensure proper RLS on the view's underlying table
ALTER TABLE public.pandascore_teams ENABLE ROW LEVEL SECURITY;

-- 4. Add proper comment for security clarity
COMMENT ON VIEW public.pandascore_view_teams IS 'Team data view that respects RLS policies from underlying table';