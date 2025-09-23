-- Drop old function versions to eliminate conflicts
DROP FUNCTION IF EXISTS public.get_all_faceit_teams();
DROP FUNCTION IF EXISTS public.get_faceit_teams_prev_window_stats(timestamp with time zone, timestamp with time zone);

-- Recreate optimized functions with proper signatures
CREATE OR REPLACE FUNCTION public.get_all_faceit_teams(start_date date DEFAULT (current_date - interval '1 year')::date, end_date date DEFAULT current_date)
 RETURNS TABLE(team_id text, team_name text, logo_url text, game text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
WITH t AS (
  SELECT lower(trim(teams->'faction1'->>'name')) AS team_key,
         teams->'faction1'->>'name' AS team_name,
         NULLIF(teams->'faction1'->>'avatar', '') AS logo_url,
         game
  FROM public.faceit_matches
  WHERE match_date BETWEEN start_date AND end_date
  UNION ALL
  SELECT lower(trim(teams->'faction2'->>'name')) AS team_key,
         teams->'faction2'->>'name' AS team_name,
         NULLIF(teams->'faction2'->>'avatar', '') AS logo_url,
         game
  FROM public.faceit_matches
  WHERE match_date BETWEEN start_date AND end_date
),
filtered AS (
  SELECT * FROM t WHERE team_key IS NOT NULL AND team_key <> '' AND NOT (team_name ILIKE 'bye')
),
ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY team_key ORDER BY (logo_url IS NOT NULL) DESC) AS rnk
  FROM filtered
)
SELECT team_key AS team_id, team_name, logo_url, game
FROM ranked
WHERE rnk = 1
ORDER BY team_name;
$function$;

CREATE OR REPLACE FUNCTION public.get_faceit_teams_prev_window_stats(start_date date, end_date date)
 RETURNS TABLE(team_id text, team_name text, matches_played integer, missed_pct numeric)
 LANGUAGE sql
 STABLE
AS $function$
WITH match_window AS (
  SELECT *
  FROM public.faceit_matches
  WHERE match_date BETWEEN start_date AND end_date
    AND status = 'finished'
),
expanded AS (
  SELECT
    m.id AS match_id,
    (t.value->>'name') AS raw_name
  FROM match_window m
  CROSS JOIN LATERAL jsonb_each(m.teams) AS t
),
normalized AS (
  SELECT
    match_id,
    -- normalize: trim, collapse spaces, lower
    lower(regexp_replace(trim(raw_name), '\s+', ' ', 'g')) AS team_key,
    raw_name
  FROM expanded
)
SELECT
  team_key                        AS team_id,         -- your stable key = normalized name
  max(raw_name)                   AS team_name,       -- display name (latest casing)
  count(DISTINCT match_id)        AS matches_played,
  0                               AS missed_pct       -- TODO: plug real abandoned logic when ready
FROM normalized
GROUP BY team_key;
$function$;