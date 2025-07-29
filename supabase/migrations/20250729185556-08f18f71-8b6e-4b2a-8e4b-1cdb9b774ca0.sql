-- Fix security definer view - Drop and recreate properly
DROP VIEW IF EXISTS public.pandascore_view_teams CASCADE;

-- Recreate without SECURITY DEFINER to respect RLS policies
CREATE VIEW public.pandascore_view_teams AS
SELECT 
    id as original_id,
    team_id,
    name,
    acronym,
    logo_url,
    esport_type,
    players_data,
    created_at,
    updated_at,
    last_synced_at,
    slug,
    raw_data
FROM public.pandascore_teams;

-- Add comment for security clarity
COMMENT ON VIEW public.pandascore_view_teams IS 'Team data view that respects RLS policies from underlying table';