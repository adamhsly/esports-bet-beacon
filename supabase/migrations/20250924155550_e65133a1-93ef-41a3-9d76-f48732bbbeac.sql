-- Fix final scores display in match_cards_day view
DROP VIEW IF EXISTS match_cards_day;

CREATE VIEW match_cards_day AS
-- PandaScore matches
SELECT
  pm.match_id,
  pm.match_date,
  COALESCE(pm.teams->0->'opponent'->>'name', 'TBD') as team1_name,
  COALESCE(pm.teams->0->'opponent'->>'image_url', '') as team1_logo,
  COALESCE(pm.teams->0->'opponent'->>'id', '') as team1_id,
  COALESCE(pm.teams->1->'opponent'->>'name', 'TBD') as team2_name,
  COALESCE(pm.teams->1->'opponent'->>'image_url', '') as team2_logo,
  COALESCE(pm.teams->1->'opponent'->>'id', '') as team2_id,
  pm.start_time,
  COALESCE(pm.tournament_name, pm.league_name, 'Unknown Tournament') as tournament,
  pm.esport_type,
  pm.status,
  pm.number_of_games as best_of,
  'professional' as source,
  pm.winner_id,
  pm.winner_type,
  -- Calculate final score from results
  CASE 
    WHEN pm.status = 'finished' AND pm.raw_data->'results' IS NOT NULL THEN
      CASE 
        WHEN jsonb_array_length(pm.raw_data->'results') >= 2 THEN
          CONCAT(
            COALESCE((pm.raw_data->'results'->0->>'score')::text, '0'),
            '-',
            COALESCE((pm.raw_data->'results'->1->>'score')::text, '0')
          )
        WHEN jsonb_array_length(pm.raw_data->'results') = 1 THEN
          CONCAT(
            COALESCE((pm.raw_data->'results'->0->>'score')::text, '0'),
            '-0'
          )
        ELSE NULL
      END
    ELSE NULL
  END as final_score,
  pm.raw_data
FROM pandascore_matches pm
WHERE pm.match_date IS NOT NULL

UNION ALL

-- FACEIT matches
SELECT
  fm.match_id,
  fm.match_date,
  COALESCE(fm.teams->'faction1'->>'name', 'TBD') as team1_name,
  COALESCE(fm.teams->'faction1'->>'avatar', '') as team1_logo,
  LOWER(TRIM(COALESCE(fm.teams->'faction1'->>'name', 'tbd'))) as team1_id,
  COALESCE(fm.teams->'faction2'->>'name', 'TBD') as team2_name,
  COALESCE(fm.teams->'faction2'->>'avatar', '') as team2_logo,
  LOWER(TRIM(COALESCE(fm.teams->'faction2'->>'name', 'tbd'))) as team2_id,
  COALESCE(fm.started_at, fm.scheduled_at) as start_time,
  COALESCE(fm.competition_name, 'Unknown Tournament') as tournament,
  fm.game as esport_type,
  fm.status,
  3 as best_of, -- FACEIT matches are typically BO3
  'amateur' as source,
  CASE 
    WHEN fm.faceit_data->'results'->>'winner' = 'faction1' THEN LOWER(TRIM(COALESCE(fm.teams->'faction1'->>'name', 'tbd')))
    WHEN fm.faceit_data->'results'->>'winner' = 'faction2' THEN LOWER(TRIM(COALESCE(fm.teams->'faction2'->>'name', 'tbd')))
    ELSE NULL
  END as winner_id,
  CASE 
    WHEN fm.faceit_data->'results'->>'winner' IS NOT NULL THEN 'Team'
    ELSE NULL
  END as winner_type,
  -- Calculate final score from FACEIT results
  CASE 
    WHEN fm.status = 'finished' AND fm.faceit_data->'results'->'score' IS NOT NULL THEN
      CONCAT(
        COALESCE((fm.faceit_data->'results'->'score'->>'faction1')::text, '0'),
        '-',
        COALESCE((fm.faceit_data->'results'->'score'->>'faction2')::text, '0')
      )
    ELSE NULL
  END as final_score,
  fm.raw_data
FROM faceit_matches fm
WHERE fm.match_date IS NOT NULL;