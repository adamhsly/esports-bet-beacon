-- Drop existing function
DROP FUNCTION IF EXISTS public.get_all_faceit_teams(date, date);

-- Recreate get_all_faceit_teams with region field
CREATE OR REPLACE FUNCTION public.get_all_faceit_teams(
  start_date date DEFAULT (current_date - interval '1 year')::date, 
  end_date date DEFAULT current_date
)
RETURNS TABLE(
  team_id text, 
  team_name text, 
  logo_url text, 
  game text,
  region text
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
WITH t AS (
  SELECT 
    lower(trim(teams->'faction1'->>'name')) AS team_key,
    teams->'faction1'->>'name' AS team_name,
    NULLIF(teams->'faction1'->>'avatar', '') AS logo_url,
    game,
    region,
    match_date
  FROM public.faceit_matches
  WHERE match_date BETWEEN start_date AND end_date
  UNION ALL
  SELECT 
    lower(trim(teams->'faction2'->>'name')) AS team_key,
    teams->'faction2'->>'name' AS team_name,
    NULLIF(teams->'faction2'->>'avatar', '') AS logo_url,
    game,
    region,
    match_date
  FROM public.faceit_matches
  WHERE match_date BETWEEN start_date AND end_date
),
filtered AS (
  SELECT * 
  FROM t 
  WHERE team_key IS NOT NULL 
    AND team_key <> '' 
    AND NOT (team_name ILIKE 'bye')
),
ranked AS (
  SELECT *, 
    ROW_NUMBER() OVER (
      PARTITION BY team_key 
      ORDER BY match_date DESC, (logo_url IS NOT NULL) DESC
    ) AS rnk
  FROM filtered
)
SELECT 
  team_key AS team_id, 
  team_name, 
  logo_url, 
  game,
  region
FROM ranked
WHERE rnk = 1
ORDER BY team_name;
$function$;