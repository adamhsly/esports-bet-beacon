
-- Create view to extract unique teams from pandascore_matches teams field.
CREATE OR REPLACE VIEW public.pandascore_view_teams AS
SELECT
  DISTINCT
  (team->>'id')::text AS team_id,
  pm.esport_type,
  team->>'name' AS name,
  team->>'logo' AS logo_url,
  team->>'acronym' AS acronym,
  team->>'slug' AS slug,
  team->>'id' AS original_id,
  COALESCE(team->'players', '[]'::jsonb) AS players_data
FROM public.pandascore_matches pm,
  LATERAL (
    SELECT jsonb_array_elements(jsonb_build_array(
      pm.teams->'team1',
      pm.teams->'team2'
    )) AS team
  ) t
WHERE (team->>'id') IS NOT NULL;

-- (Optional) You may want to grant select permissions on this view for public;
GRANT SELECT ON public.pandascore_view_teams TO anon;

