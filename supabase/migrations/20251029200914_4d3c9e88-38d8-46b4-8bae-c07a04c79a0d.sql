-- Drop existing function
DROP FUNCTION IF EXISTS public.get_team_stats_optimized(text);

-- Recreate function with support for both array and object formats
CREATE OR REPLACE FUNCTION public.get_team_stats_optimized(p_team_id text)
RETURNS TABLE(
  win_rate numeric,
  recent_form text,
  tournament_wins bigint,
  total_matches bigint
) AS $$
DECLARE
  team_id text := p_team_id;
  v_win_rate numeric;
  v_recent_form text;
  v_tournament_wins bigint;
  v_total_matches bigint;
BEGIN
  -- Calculate win rate from recent matches (last 90 days)
  WITH recent_matches AS (
    SELECT 
      m.id,
      m.winner_id,
      m.begin_at
    FROM pandascore_matches m
    WHERE m.status = 'finished'
      AND m.begin_at >= NOW() - INTERVAL '90 days'
      AND (
        -- Handle array format
        (jsonb_typeof(m.teams) = 'array' 
         AND m.teams @> jsonb_build_array(jsonb_build_object('opponent', jsonb_build_object('id', team_id))))
        OR
        -- Handle object format (team1/team2 keys)
        (jsonb_typeof(m.teams) = 'object'
         AND (m.teams->'team1'->>'id' = team_id OR m.teams->'team2'->>'id' = team_id))
      )
  ),
  win_stats AS (
    SELECT 
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE winner_id::text = team_id) AS wins
    FROM recent_matches
  )
  SELECT 
    CASE 
      WHEN total > 0 THEN ROUND((wins::numeric / total::numeric) * 100, 2)
      ELSE 0
    END
  INTO v_win_rate
  FROM win_stats;

  -- Get recent form (last 10 matches, W/L string)
  WITH last_10 AS (
    SELECT 
      m.id,
      m.winner_id,
      m.begin_at,
      (CASE 
        WHEN jsonb_typeof(m.teams) = 'array' THEN
          (SELECT t->'opponent'->>'name' 
           FROM jsonb_array_elements(m.teams) t 
           WHERE t->'opponent'->>'id' <> team_id
           LIMIT 1)
        ELSE
          CASE 
            WHEN m.teams->'team1'->>'id' = team_id THEN m.teams->'team2'->>'name'
            ELSE m.teams->'team1'->>'name'
          END
      END) AS opponent_name
    FROM pandascore_matches m
    WHERE m.status = 'finished'
      AND (
        -- Handle array format
        (jsonb_typeof(m.teams) = 'array' 
         AND m.teams @> jsonb_build_array(jsonb_build_object('opponent', jsonb_build_object('id', team_id))))
        OR
        -- Handle object format
        (jsonb_typeof(m.teams) = 'object'
         AND (m.teams->'team1'->>'id' = team_id OR m.teams->'team2'->>'id' = team_id))
      )
    ORDER BY m.begin_at DESC
    LIMIT 10
  )
  SELECT string_agg(
    CASE 
      WHEN winner_id::text = team_id THEN 'W'
      ELSE 'L'
    END, 
    ''
    ORDER BY begin_at DESC
  )
  INTO v_recent_form
  FROM last_10;

  -- Count tournament wins
  SELECT COUNT(DISTINCT m.tournament_id)
  INTO v_tournament_wins
  FROM pandascore_matches m
  WHERE m.status = 'finished'
    AND m.winner_id::text = team_id
    AND (
      -- Handle array format
      (jsonb_typeof(m.teams) = 'array' 
       AND m.teams @> jsonb_build_array(jsonb_build_object('opponent', jsonb_build_object('id', team_id))))
      OR
      -- Handle object format
      (jsonb_typeof(m.teams) = 'object'
       AND (m.teams->'team1'->>'id' = team_id OR m.teams->'team2'->>'id' = team_id))
    );

  -- Count total matches
  SELECT COUNT(*)
  INTO v_total_matches
  FROM pandascore_matches m
  WHERE m.status = 'finished'
    AND (
      -- Handle array format
      (jsonb_typeof(m.teams) = 'array' 
       AND m.teams @> jsonb_build_array(jsonb_build_object('opponent', jsonb_build_object('id', team_id))))
      OR
      -- Handle object format
      (jsonb_typeof(m.teams) = 'object'
       AND (m.teams->'team1'->>'id' = team_id OR m.teams->'team2'->>'id' = team_id))
    );

  -- Return the results
  RETURN QUERY SELECT 
    COALESCE(v_win_rate, 0),
    COALESCE(v_recent_form, ''),
    COALESCE(v_tournament_wins, 0),
    COALESCE(v_total_matches, 0);
END;
$$ LANGUAGE plpgsql STABLE;