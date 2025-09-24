-- Drop and recreate match_cards_day view to include raw_data
DROP VIEW IF EXISTS match_cards_day;

CREATE VIEW match_cards_day AS
-- Faceit matches
SELECT 
  match_id,
  match_date,
  teams->'faction1'->>'name' as team1_name,
  teams->'faction1'->>'avatar' as team1_logo,
  teams->'faction1'->>'name' as team1_id,
  teams->'faction2'->>'name' as team2_name,
  teams->'faction2'->>'avatar' as team2_logo,
  teams->'faction2'->>'name' as team2_id,
  COALESCE(started_at, scheduled_at) as start_time,
  COALESCE(competition_name, organized_by, 'Unknown Tournament') as tournament,
  game as esport_type,
  status,
  3 as best_of,
  'amateur' as source,
  NULL as winner_id,
  NULL as winner_type,
  NULL as final_score,
  NULL as league_name,
  raw_data
FROM faceit_matches

UNION ALL

-- PandaScore matches
SELECT 
  match_id,
  match_date,
  CASE 
    WHEN jsonb_array_length(teams) >= 1 THEN teams->0->'opponent'->>'name'
    ELSE NULL
  END as team1_name,
  CASE 
    WHEN jsonb_array_length(teams) >= 1 THEN teams->0->'opponent'->>'image_url'
    ELSE NULL
  END as team1_logo,
  CASE 
    WHEN jsonb_array_length(teams) >= 1 THEN teams->0->'opponent'->>'id'
    ELSE NULL
  END as team1_id,
  CASE 
    WHEN jsonb_array_length(teams) >= 2 THEN teams->1->'opponent'->>'name'
    ELSE NULL
  END as team2_name,
  CASE 
    WHEN jsonb_array_length(teams) >= 2 THEN teams->1->'opponent'->>'image_url'
    ELSE NULL
  END as team2_logo,
  CASE 
    WHEN jsonb_array_length(teams) >= 2 THEN teams->1->'opponent'->>'id'
    ELSE NULL
  END as team2_id,
  start_time,
  COALESCE(tournament_name, league_name, 'Unknown Tournament') as tournament,
  esport_type,
  status,
  number_of_games as best_of,
  'professional' as source,
  winner_id,
  winner_type,
  NULL as final_score,
  league_name,
  raw_data
FROM pandascore_matches;