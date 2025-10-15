-- Create optimized fantasy score calculation function
CREATE OR REPLACE FUNCTION calculate_fantasy_scores_batch(
  team_data jsonb,
  start_date timestamptz,
  end_date timestamptz
)
RETURNS TABLE (
  team_id text,
  team_name text,
  match_wins bigint,
  map_wins bigint,
  clean_sweeps bigint,
  matches_played bigint
) AS $$
BEGIN
  -- Extract team IDs and names from input
  CREATE TEMP TABLE temp_teams AS
  SELECT 
    (t->>'team_id')::text as team_id,
    (t->>'team_name')::text as team_name
  FROM jsonb_array_elements(team_data) as t;

  -- Calculate PandaScore stats
  RETURN QUERY
  WITH pandascore_stats AS (
    SELECT
      tt.team_id,
      tt.team_name,
      COUNT(*) FILTER (WHERE pm.winner_id = tt.team_id) as panda_wins,
      COUNT(*) as panda_matches,
      COALESCE(SUM(
        (SELECT COUNT(*)::bigint
         FROM jsonb_array_elements(pm.raw_data->'games') g
         WHERE (g->'winner'->>'id')::text = tt.team_id)
      ), 0) as panda_map_wins,
      COUNT(*) FILTER (
        WHERE pm.winner_id = tt.team_id
        AND (
          (pm.number_of_games = 3 
           AND (SELECT COUNT(*) FROM jsonb_array_elements(pm.raw_data->'games') g 
                WHERE (g->'winner'->>'id')::text = tt.team_id) = 2
           AND jsonb_array_length(pm.raw_data->'games') = 2)
          OR
          (pm.number_of_games = 5 
           AND (SELECT COUNT(*) FROM jsonb_array_elements(pm.raw_data->'games') g 
                WHERE (g->'winner'->>'id')::text = tt.team_id) = 3
           AND jsonb_array_length(pm.raw_data->'games') = 3)
        )
      ) as panda_clean_sweeps
    FROM temp_teams tt
    LEFT JOIN pandascore_matches pm ON (
      pm.status = 'finished'
      AND pm.start_time >= start_date
      AND pm.start_time <= end_date
      AND (
        pm.teams::jsonb @> jsonb_build_array(jsonb_build_object('opponent', jsonb_build_object('id', tt.team_id::int)))
        OR pm.teams::text ILIKE '%' || tt.team_id || '%'
      )
    )
    GROUP BY tt.team_id, tt.team_name
  ),
  faceit_stats AS (
    SELECT
      tt.team_id,
      tt.team_name,
      COUNT(*) FILTER (
        WHERE (
          (LOWER(fm.teams->'faction1'->>'name') = LOWER(tt.team_name) AND fm.faceit_data->'results'->>'winner' = 'faction1')
          OR (LOWER(fm.teams->'faction2'->>'name') = LOWER(tt.team_name) AND fm.faceit_data->'results'->>'winner' = 'faction2')
        )
      ) as faceit_wins,
      COUNT(*) as faceit_matches,
      COALESCE(SUM(
        CASE
          WHEN LOWER(fm.teams->'faction1'->>'name') = LOWER(tt.team_name) 
          THEN COALESCE((fm.faceit_data->'results'->'score'->>'faction1')::int, 0)
          WHEN LOWER(fm.teams->'faction2'->>'name') = LOWER(tt.team_name)
          THEN COALESCE((fm.faceit_data->'results'->'score'->>'faction2')::int, 0)
          ELSE 0
        END
      ), 0) as faceit_map_wins,
      COUNT(*) FILTER (
        WHERE (
          (LOWER(fm.teams->'faction1'->>'name') = LOWER(tt.team_name) 
           AND fm.faceit_data->'results'->>'winner' = 'faction1'
           AND COALESCE((fm.faceit_data->'results'->'score'->>'faction2')::int, 0) = 0)
          OR
          (LOWER(fm.teams->'faction2'->>'name') = LOWER(tt.team_name)
           AND fm.faceit_data->'results'->>'winner' = 'faction2'
           AND COALESCE((fm.faceit_data->'results'->'score'->>'faction1')::int, 0) = 0)
        )
      ) as faceit_clean_sweeps
    FROM temp_teams tt
    LEFT JOIN faceit_matches fm ON (
      fm.status IN ('finished', 'FINISHED')
      AND fm.started_at >= start_date
      AND fm.started_at <= end_date
      AND (
        LOWER(fm.teams->'faction1'->>'name') = LOWER(tt.team_name)
        OR LOWER(fm.teams->'faction2'->>'name') = LOWER(tt.team_name)
        OR fm.teams::text ILIKE '%' || tt.team_name || '%'
      )
    )
    GROUP BY tt.team_id, tt.team_name
  )
  SELECT
    ps.team_id,
    ps.team_name,
    (COALESCE(ps.panda_wins, 0) + COALESCE(fs.faceit_wins, 0))::bigint as match_wins,
    (COALESCE(ps.panda_map_wins, 0) + COALESCE(fs.faceit_map_wins, 0))::bigint as map_wins,
    (COALESCE(ps.panda_clean_sweeps, 0) + COALESCE(fs.faceit_clean_sweeps, 0))::bigint as clean_sweeps,
    (COALESCE(ps.panda_matches, 0) + COALESCE(fs.faceit_matches, 0))::bigint as matches_played
  FROM pandascore_stats ps
  FULL OUTER JOIN faceit_stats fs USING (team_id, team_name);

  DROP TABLE temp_teams;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for better performance on date and status filtering
CREATE INDEX IF NOT EXISTS idx_pandascore_matches_time_status 
  ON pandascore_matches(start_time, status) 
  WHERE status = 'finished';

CREATE INDEX IF NOT EXISTS idx_faceit_matches_time_status 
  ON faceit_matches(started_at, status) 
  WHERE status IN ('finished', 'FINISHED');

-- Add GIN indexes for JSONB team matching (improves @> operator performance)
CREATE INDEX IF NOT EXISTS idx_pandascore_matches_teams_gin 
  ON pandascore_matches USING gin(teams);

CREATE INDEX IF NOT EXISTS idx_faceit_matches_teams_gin 
  ON faceit_matches USING gin(teams);