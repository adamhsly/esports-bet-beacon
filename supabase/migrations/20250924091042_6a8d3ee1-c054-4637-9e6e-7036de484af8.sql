-- Drop existing views (cascade to handle dependencies)
DROP VIEW IF EXISTS match_cards_day CASCADE;
DROP VIEW IF EXISTS pandascore_cards CASCADE;
DROP VIEW IF EXISTS faceit_cards CASCADE;

-- Recreate pandascore_cards with selective winner/score data
CREATE VIEW pandascore_cards AS
SELECT 
  match_id,
  match_date,
  team1_name,
  team1_logo,
  team1_id,
  team2_name,
  team2_logo,
  team2_id,
  start_time,
  tournament,
  esport_type,
  status,
  best_of,
  league_name,
  'professional' as source,
  -- Extract selective winner/score data from raw_data
  CASE 
    WHEN status = 'finished' AND raw_data->'winner'->>'id' IS NOT NULL 
    THEN raw_data->'winner'->>'id'
    ELSE winner_id
  END as winner_id,
  CASE 
    WHEN status = 'finished' AND raw_data->'winner'->>'type' IS NOT NULL 
    THEN raw_data->'winner'->>'type'
    ELSE NULL
  END as winner_type,
  CASE 
    WHEN status = 'finished' AND jsonb_array_length(COALESCE(raw_data->'games', '[]'::jsonb)) > 0
    THEN (
      SELECT string_agg(
        CASE 
          WHEN (game->'teams'->0->'score')::int > (game->'teams'->1->'score')::int THEN '1'
          WHEN (game->'teams'->0->'score')::int < (game->'teams'->1->'score')::int THEN '0'
          ELSE 'D'
        END, 
        '-'
      )
      FROM jsonb_array_elements(raw_data->'games') as game
      WHERE game->'teams'->0->'score' IS NOT NULL 
        AND game->'teams'->1->'score' IS NOT NULL
    )
    ELSE NULL
  END as final_score
FROM (
  SELECT 
    match_id,
    (start_time)::date as match_date,
    COALESCE(teams->0->'opponent'->>'name', teams->0->>'name') as team1_name,
    COALESCE(teams->0->'opponent'->>'image_url', teams->0->>'logo') as team1_logo,
    COALESCE(teams->0->'opponent'->>'id', teams->0->>'id') as team1_id,
    COALESCE(teams->1->'opponent'->>'name', teams->1->>'name') as team2_name,
    COALESCE(teams->1->'opponent'->>'image_url', teams->1->>'logo') as team2_logo,
    COALESCE(teams->1->'opponent'->>'id', teams->1->>'id') as team2_id,
    start_time,
    COALESCE(tournament_name, league_name) as tournament,
    esport_type,
    status,
    number_of_games as best_of,
    league_name,
    raw_data,
    winner_id
  FROM pandascore_matches
  WHERE teams IS NOT NULL 
    AND jsonb_array_length(teams) >= 2
) subquery;

-- Recreate faceit_cards with selective winner/score data
CREATE VIEW faceit_cards AS
SELECT 
  match_id,
  match_date,
  team1_name,
  team1_logo,
  team1_id,
  team2_name,
  team2_logo,
  team2_id,
  start_time,
  tournament,
  esport_type,
  status,
  best_of,
  league_name,
  'amateur' as source,
  -- Extract selective winner/score data from faceit_data
  CASE 
    WHEN status = 'finished' AND faceit_data->'results'->>'winner' IS NOT NULL 
    THEN faceit_data->'results'->>'winner'
    ELSE NULL
  END as winner_id,
  NULL as winner_type, -- FACEIT doesn't have winner_type
  CASE 
    WHEN status = 'finished' AND faceit_data->'results'->'score' IS NOT NULL
    THEN CONCAT(
      COALESCE(faceit_data->'results'->'score'->>'faction1', '0'),
      '-',
      COALESCE(faceit_data->'results'->'score'->>'faction2', '0')
    )
    ELSE NULL
  END as final_score
FROM (
  SELECT 
    match_id,
    match_date,
    teams->'faction1'->>'name' as team1_name,
    teams->'faction1'->>'avatar' as team1_logo,
    lower(trim(teams->'faction1'->>'name')) as team1_id,
    teams->'faction2'->>'name' as team2_name,
    teams->'faction2'->>'avatar' as team2_logo,
    lower(trim(teams->'faction2'->>'name')) as team2_id,
    COALESCE(started_at, scheduled_at) as start_time,
    COALESCE(competition_name, organized_by) as tournament,
    game as esport_type,
    status,
    3 as best_of, -- Default for FACEIT
    competition_name as league_name,
    faceit_data
  FROM faceit_matches
  WHERE teams IS NOT NULL
) subquery;

-- Recreate match_cards_day as UNION of both views
CREATE VIEW match_cards_day AS
SELECT 
  match_id,
  match_date,
  team1_name,
  team1_logo,
  team1_id,
  team2_name,
  team2_logo,
  team2_id,
  start_time,
  tournament,
  esport_type,
  status,
  best_of,
  source,
  league_name,
  winner_id,
  winner_type,
  final_score
FROM pandascore_cards
UNION ALL
SELECT 
  match_id,
  match_date,
  team1_name,
  team1_logo,
  team1_id,
  team2_name,
  team2_logo,
  team2_id,
  start_time,
  tournament,
  esport_type,
  status,
  best_of,
  source,
  league_name,
  winner_id,
  winner_type,
  final_score
FROM faceit_cards;