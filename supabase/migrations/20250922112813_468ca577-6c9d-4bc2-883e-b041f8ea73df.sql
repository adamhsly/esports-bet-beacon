-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_faceit_matches_date_status 
ON faceit_matches (match_date, status);

CREATE INDEX IF NOT EXISTS idx_pandascore_matches_date_status 
ON pandascore_matches (match_date, status);

-- Create materialized view for daily match counts
CREATE MATERIALIZED VIEW daily_match_counts AS
WITH faceit_counts AS (
  SELECT 
    match_date,
    'amateur' as source,
    COUNT(*) as match_count
  FROM faceit_matches
  WHERE match_date IS NOT NULL
    AND NOT (teams->'faction1'->>'name' ILIKE ANY(ARRAY['%tbc%', '%tbd%', '%bye%']))
    AND NOT (teams->'faction2'->>'name' ILIKE ANY(ARRAY['%tbc%', '%tbd%', '%bye%']))
    AND NOT (status IN ('finished', 'completed') AND 
             (teams->'faction1'->>'name' ILIKE '%bye%' OR teams->'faction2'->>'name' ILIKE '%bye%'))
  GROUP BY match_date
),
pandascore_counts AS (
  SELECT 
    match_date,
    'professional' as source,
    COUNT(*) as match_count
  FROM pandascore_matches
  WHERE match_date IS NOT NULL
    AND teams IS NOT NULL
    AND jsonb_array_length(teams) >= 2
    AND NOT (teams->0->'opponent'->>'name' ILIKE ANY(ARRAY['%tbc%', '%tbd%']))
    AND NOT (teams->1->'opponent'->>'name' ILIKE ANY(ARRAY['%tbc%', '%tbd%']))
  GROUP BY match_date
)
SELECT match_date, source, match_count FROM faceit_counts
UNION ALL
SELECT match_date, source, match_count FROM pandascore_counts;

-- Create unique index on materialized view
CREATE UNIQUE INDEX ON daily_match_counts (match_date, source);

-- Create lightweight card views
CREATE VIEW faceit_cards AS
SELECT 
  match_id,
  match_date,
  teams->'faction1'->>'name' as team1_name,
  teams->'faction1'->>'avatar' as team1_logo,
  teams->'faction1'->>'faction_id' as team1_id,
  teams->'faction2'->>'name' as team2_name,
  teams->'faction2'->>'avatar' as team2_logo,
  teams->'faction2'->>'faction_id' as team2_id,
  COALESCE(started_at, scheduled_at) as start_time,
  competition_name as tournament,
  game as esport_type,
  status,
  COALESCE((raw_data->>'best_of')::int, 3) as best_of,
  'amateur' as source
FROM faceit_matches
WHERE match_date IS NOT NULL
  AND NOT (teams->'faction1'->>'name' ILIKE ANY(ARRAY['%tbc%', '%tbd%', '%bye%']))
  AND NOT (teams->'faction2'->>'name' ILIKE ANY(ARRAY['%tbc%', '%tbd%', '%bye%']))
  AND NOT (status IN ('finished', 'completed') AND 
           (teams->'faction1'->>'name' ILIKE '%bye%' OR teams->'faction2'->>'name' ILIKE '%bye%'));

CREATE VIEW pandascore_cards AS  
SELECT 
  match_id,
  match_date,
  teams->0->'opponent'->>'name' as team1_name,
  teams->0->'opponent'->>'image_url' as team1_logo,
  teams->0->'opponent'->>'id' as team1_id,
  teams->1->'opponent'->>'name' as team2_name,
  teams->1->'opponent'->>'image_url' as team2_logo,
  teams->1->'opponent'->>'id' as team2_id,
  start_time,
  COALESCE(tournament_name, league_name) as tournament,
  esport_type,
  status,
  COALESCE(number_of_games, 3) as best_of,
  'professional' as source
FROM pandascore_matches
WHERE match_date IS NOT NULL
  AND teams IS NOT NULL
  AND jsonb_array_length(teams) >= 2
  AND NOT (teams->0->'opponent'->>'name' ILIKE ANY(ARRAY['%tbc%', '%tbd%']))
  AND NOT (teams->1->'opponent'->>'name' ILIKE ANY(ARRAY['%tbc%', '%tbd%']));

-- Create unified match cards view
CREATE VIEW match_cards_day AS
SELECT * FROM faceit_cards
UNION ALL  
SELECT * FROM pandascore_cards;

-- Function to get daily match counts (fast)
CREATE OR REPLACE FUNCTION get_daily_match_counts_fast(start_date date, end_date date)
RETURNS TABLE(match_date date, source text, count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT dmc.match_date, dmc.source, dmc.match_count
  FROM daily_match_counts dmc
  WHERE dmc.match_date BETWEEN start_date AND end_date
  ORDER BY dmc.match_date, dmc.source;
END;
$$ LANGUAGE plpgsql;

-- Function to get paginated match cards for a specific date
CREATE OR REPLACE FUNCTION get_match_cards_paginated(
  target_date date, 
  page_size int DEFAULT 50,
  cursor_time timestamptz DEFAULT NULL
)
RETURNS TABLE(
  match_id text,
  match_date date,
  team1_name text,
  team1_logo text,
  team1_id text,
  team2_name text,
  team2_logo text,
  team2_id text,
  start_time timestamptz,
  tournament text,
  esport_type text,
  status text,
  best_of int,
  source text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mcd.match_id,
    mcd.match_date,
    mcd.team1_name,
    mcd.team1_logo,
    mcd.team1_id,
    mcd.team2_name,
    mcd.team2_logo,
    mcd.team2_id,
    mcd.start_time,
    mcd.tournament,
    mcd.esport_type,
    mcd.status,
    mcd.best_of,
    mcd.source
  FROM match_cards_day mcd
  WHERE mcd.match_date = target_date
    AND (cursor_time IS NULL OR mcd.start_time > cursor_time)
  ORDER BY mcd.start_time ASC, mcd.match_id ASC
  LIMIT page_size;
END;
$$ LANGUAGE plpgsql;

-- Function to get heavy match details on demand
CREATE OR REPLACE FUNCTION get_match_details_heavy(p_match_id text, p_source text)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  IF p_source = 'amateur' THEN
    SELECT jsonb_build_object(
      'raw_data', raw_data,
      'faceit_data', faceit_data,
      'voting', voting,
      'teams', teams,
      'live_team_scores', live_team_scores,
      'maps_played', maps_played,
      'round_results', round_results
    ) INTO result
    FROM faceit_matches
    WHERE match_id = p_match_id;
  ELSE
    SELECT jsonb_build_object(
      'raw_data', raw_data,
      'teams', teams,
      'winner_id', winner_id,
      'stream_url_1', stream_url_1,
      'stream_url_2', stream_url_2
    ) INTO result
    FROM pandascore_matches
    WHERE match_id = p_match_id;
  END IF;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Refresh materialized view function (to be called by cron)
CREATE OR REPLACE FUNCTION refresh_daily_match_counts()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_match_counts;
END;
$$ LANGUAGE plpgsql;