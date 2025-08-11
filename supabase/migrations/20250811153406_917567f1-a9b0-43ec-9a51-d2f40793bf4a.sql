-- Create RPC to compute FACEIT team stats for a previous window
CREATE OR REPLACE FUNCTION public.get_faceit_teams_prev_window_stats(start_ts timestamp with time zone, end_ts timestamp with time zone)
RETURNS TABLE(
  team_id text,
  team_name text,
  logo_url text,
  game text,
  total_scheduled integer,
  played_matches integer,
  byes integer,
  missed_pct numeric
) AS $$
WITH matches AS (
  SELECT *
  FROM public.faceit_matches m
  WHERE COALESCE(m.scheduled_at, m.started_at) >= start_ts
    AND COALESCE(m.scheduled_at, m.started_at) < end_ts
),
team_pairs AS (
  SELECT 
    lower(trim(m.teams->'faction1'->>'name')) AS t1_key,
    m.teams->'faction1'->>'name' AS t1_name,
    NULLIF(m.teams->'faction1'->>'avatar', '') AS t1_logo,
    lower(trim(m.teams->'faction2'->>'name')) AS t2_key,
    m.teams->'faction2'->>'name' AS t2_name,
    NULLIF(m.teams->'faction2'->>'avatar', '') AS t2_logo,
    m.game
  FROM matches m
),
flat AS (
  SELECT t1_key AS team_key, t1_name AS team_name, t1_logo AS logo_url, t2_key AS opp_key, game FROM team_pairs
  UNION ALL
  SELECT t2_key, t2_name, t2_logo, t1_key, game FROM team_pairs
),
clean AS (
  SELECT 
    CASE WHEN team_key IS NULL OR team_key = '' OR team_name ILIKE 'bye' THEN NULL ELSE team_key END AS team_key,
    team_name,
    logo_url,
    opp_key,
    game
  FROM flat
)
SELECT 
  team_key AS team_id,
  max(team_name) AS team_name,
  max(logo_url) AS logo_url,
  max(game) AS game,
  count(*)::int AS total_scheduled,
  (count(*) - count(*) FILTER (WHERE opp_key IS NULL OR lower(opp_key) = 'bye'))::int AS played_matches,
  count(*) FILTER (WHERE opp_key IS NULL OR lower(opp_key) = 'bye')::int AS byes,
  CASE WHEN count(*) > 0 THEN round((count(*) FILTER (WHERE opp_key IS NULL OR lower(opp_key) = 'bye'))::numeric / count(*) * 100, 1) ELSE 0 END AS missed_pct
FROM clean
WHERE team_key IS NOT NULL
GROUP BY team_key
ORDER BY played_matches DESC, missed_pct ASC;
$$ LANGUAGE sql STABLE;

-- Create RPC to get all unique FACEIT teams across the database
CREATE OR REPLACE FUNCTION public.get_all_faceit_teams()
RETURNS TABLE(
  team_id text,
  team_name text,
  logo_url text,
  game text
) AS $$
WITH t AS (
  SELECT lower(trim(teams->'faction1'->>'name')) AS team_key,
         teams->'faction1'->>'name' AS team_name,
         NULLIF(teams->'faction1'->>'avatar', '') AS logo_url,
         game
  FROM public.faceit_matches
  UNION ALL
  SELECT lower(trim(teams->'faction2'->>'name')) AS team_key,
         teams->'faction2'->>'name' AS team_name,
         NULLIF(teams->'faction2'->>'avatar', '') AS logo_url,
         game
  FROM public.faceit_matches
),
filtered AS (
  SELECT * FROM t WHERE team_key IS NOT NULL AND team_key <> '' AND NOT (team_name ILIKE 'bye')
),
-- Deduplicate by team_key, prefer rows with a logo
ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY team_key ORDER BY (logo_url IS NOT NULL) DESC) AS rnk
  FROM filtered
)
SELECT team_key AS team_id, team_name, logo_url, game
FROM ranked
WHERE rnk = 1
ORDER BY team_name;
$$ LANGUAGE sql STABLE;