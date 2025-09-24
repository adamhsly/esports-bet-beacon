-- Fix PandaScore cards view to correctly extract final scores from raw_data->results
DROP VIEW IF EXISTS match_cards_day;
DROP VIEW IF EXISTS pandascore_cards;

-- Recreate pandascore_cards view with correct score extraction logic and matching column structure
CREATE VIEW pandascore_cards AS
SELECT 
  pm.match_id,
  pm.match_date,
  (pm.teams->0->'opponent'->>'name') AS team1_name,
  (pm.teams->0->'opponent'->>'image_url') AS team1_logo,
  (pm.teams->0->'opponent'->>'id') AS team1_id,
  (pm.teams->1->'opponent'->>'name') AS team2_name,
  (pm.teams->1->'opponent'->>'image_url') AS team2_logo,
  (pm.teams->1->'opponent'->>'id') AS team2_id,
  pm.start_time,
  COALESCE(pm.tournament_name, pm.league_name) AS tournament,
  pm.esport_type,
  pm.status,
  pm.number_of_games AS best_of,
  pm.league_name,
  'professional' AS source,
  pm.winner_id,
  pm.winner_type,
  -- Extract final score from raw_data->results array
  CASE 
    WHEN pm.status = 'finished' AND pm.raw_data->'results' IS NOT NULL THEN
      CASE 
        -- If first result team_id matches team1_id, format as team1_score-team2_score
        WHEN (pm.raw_data->'results'->0->>'team_id') = (pm.teams->0->'opponent'->>'id') THEN
          CONCAT(
            pm.raw_data->'results'->0->>'score',
            '-',
            pm.raw_data->'results'->1->>'score'
          )
        -- Otherwise format as team2_score-team1_score (results are in reverse order)
        ELSE
          CONCAT(
            pm.raw_data->'results'->1->>'score',
            '-',
            pm.raw_data->'results'->0->>'score'
          )
      END
    ELSE NULL
  END AS final_score
FROM pandascore_matches pm
WHERE pm.esport_type IS NOT NULL 
  AND pm.start_time IS NOT NULL
  AND jsonb_array_length(pm.teams) >= 2;

-- Recreate match_cards_day view
CREATE VIEW match_cards_day AS
SELECT * FROM faceit_cards
UNION ALL
SELECT * FROM pandascore_cards;