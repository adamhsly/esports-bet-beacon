-- Add region column to match_cards_day view with normalization
DROP VIEW IF EXISTS match_cards_day;

CREATE VIEW match_cards_day AS
-- PandaScore matches
SELECT
  pm.match_id,
  pm.match_date,
  pm.teams->0->'opponent'->>'name' AS team1_name,
  pm.teams->0->'opponent'->>'image_url' AS team1_logo,
  pm.teams->0->'opponent'->>'id' AS team1_id,
  pm.teams->1->'opponent'->>'name' AS team2_name,
  pm.teams->1->'opponent'->>'image_url' AS team2_logo,
  pm.teams->1->'opponent'->>'id' AS team2_id,
  pm.start_time,
  COALESCE(pm.tournament_name, pm.league_name) AS tournament,
  pm.esport_type,
  pm.status,
  pm.number_of_games AS best_of,
  'professional' AS source,
  pm.winner_id,
  pm.winner_type,
  CASE 
    WHEN (pm.teams->0->>'score') IS NOT NULL AND (pm.teams->1->>'score') IS NOT NULL 
    THEN (pm.teams->0->>'score') || '-' || (pm.teams->1->>'score')
    ELSE NULL 
  END AS final_score,
  pm.raw_data,
  -- Normalize PandaScore regions: WEU, EEU, ASIA, NA, SA, OCE, ME
  CASE
    WHEN pm.raw_data->'tournament'->>'region' IN ('WEU', 'EEU') THEN 'Europe'
    WHEN pm.raw_data->'tournament'->>'region' = 'ASIA' THEN 'Asia'
    WHEN pm.raw_data->'tournament'->>'region' = 'NA' THEN 'North America'
    WHEN pm.raw_data->'tournament'->>'region' = 'SA' THEN 'South America'
    WHEN pm.raw_data->'tournament'->>'region' = 'OCE' THEN 'Oceania'
    WHEN pm.raw_data->'tournament'->>'region' = 'ME' THEN 'Middle East'
    ELSE NULL
  END AS region
FROM pandascore_matches pm
WHERE pm.match_date IS NOT NULL

UNION ALL

-- FACEIT matches (excluding BYE teams) with normalized regions
SELECT
  fm.match_id,
  fm.match_date,
  fm.teams->'faction1'->>'name' AS team1_name,
  fm.teams->'faction1'->>'avatar' AS team1_logo,
  fm.teams->'faction1'->>'id' AS team1_id,
  fm.teams->'faction2'->>'name' AS team2_name,
  fm.teams->'faction2'->>'avatar' AS team2_logo,
  fm.teams->'faction2'->>'id' AS team2_id,
  COALESCE(fm.started_at, fm.effective_start, fm.scheduled_at) AS start_time,
  fm.competition_name AS tournament,
  fm.game AS esport_type,
  fm.status,
  COALESCE((fm.raw_data->>'best_of')::integer, 3) AS best_of,
  'amateur' AS source,
  CASE 
    WHEN LOWER(COALESCE(fm.faceit_data->'results'->>'winner', fm.raw_data->'results'->>'winner', '')) = 'faction1' 
    THEN fm.teams->'faction1'->>'id'
    WHEN LOWER(COALESCE(fm.faceit_data->'results'->>'winner', fm.raw_data->'results'->>'winner', '')) = 'faction2' 
    THEN fm.teams->'faction2'->>'id'
    ELSE NULL 
  END AS winner_id,
  'team' AS winner_type,
  CASE 
    WHEN (fm.teams->'faction1'->>'score') IS NOT NULL AND (fm.teams->'faction2'->>'score') IS NOT NULL 
    THEN (fm.teams->'faction1'->>'score') || '-' || (fm.teams->'faction2'->>'score')
    ELSE NULL 
  END AS final_score,
  fm.raw_data,
  -- Normalize FACEIT regions: EU, SA, SEA, NA, US, OCE, RU
  CASE
    WHEN fm.region IN ('EU', 'RU') THEN 'Europe'
    WHEN fm.region = 'SEA' THEN 'Asia'
    WHEN fm.region IN ('NA', 'US') THEN 'North America'
    WHEN fm.region = 'SA' THEN 'South America'
    WHEN fm.region = 'OCE' THEN 'Oceania'
    ELSE NULL
  END AS region
FROM faceit_matches fm
WHERE fm.match_date IS NOT NULL
  AND LOWER(TRIM(COALESCE(fm.teams->'faction1'->>'name', ''))) != 'bye'
  AND LOWER(TRIM(COALESCE(fm.teams->'faction2'->>'name', ''))) != 'bye';