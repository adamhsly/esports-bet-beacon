-- Fix get_team_stats_optimized function with correct JSON path for team IDs
DROP FUNCTION IF EXISTS get_team_stats_optimized(text);

CREATE OR REPLACE FUNCTION get_team_stats_optimized(p_team_id text)
RETURNS TABLE (
  win_rate numeric,
  recent_form text,
  tournament_wins integer,
  total_matches integer
) AS $$
DECLARE
  v_wins integer;
  v_total integer;
  v_tournament_wins integer;
  v_recent_matches jsonb;
BEGIN
  -- Get match statistics for the last 90 days
  SELECT
    COUNT(*) FILTER (
      WHERE (
        (m.teams->0->'opponent'->>'id' = p_team_id AND m.winner_id = p_team_id)
        OR (m.teams->1->'opponent'->>'id' = p_team_id AND m.winner_id = p_team_id)
      )
    )::integer,
    COUNT(*)::integer,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'winner_id', m.winner_id,
          'team_id', p_team_id,
          'start_time', m.start_time
        )
        ORDER BY m.start_time DESC
      ) FILTER (WHERE m.status = 'finished'),
      '[]'::jsonb
    )
  INTO v_wins, v_total, v_recent_matches
  FROM pandascore_matches m
  WHERE m.status = 'finished'
    AND m.start_time >= NOW() - INTERVAL '90 days'
    AND (
      m.teams->0->'opponent'->>'id' = p_team_id
      OR m.teams->1->'opponent'->>'id' = p_team_id
    );

  -- Count tournament wins
  SELECT COUNT(DISTINCT m.tournament_id)::integer
  INTO v_tournament_wins
  FROM pandascore_matches m
  WHERE m.status = 'finished'
    AND m.winner_id = p_team_id
    AND m.match_type = 'best_of'
    AND (
      m.teams->0->'opponent'->>'id' = p_team_id
      OR m.teams->1->'opponent'->>'id' = p_team_id
    );

  -- Calculate win rate
  IF v_total = 0 THEN
    win_rate := 0;
  ELSE
    win_rate := ROUND((v_wins::numeric / v_total::numeric) * 100, 1);
  END IF;

  -- Generate recent form string (last 5 matches)
  recent_form := (
    SELECT string_agg(
      CASE
        WHEN (elem->>'winner_id') = p_team_id THEN 'W'
        ELSE 'L'
      END,
      ''
      ORDER BY (elem->>'start_time') DESC
    )
    FROM jsonb_array_elements(v_recent_matches) WITH ORDINALITY AS t(elem, ord)
    WHERE t.ord <= 5
  );

  tournament_wins := COALESCE(v_tournament_wins, 0);
  total_matches := COALESCE(v_total, 0);

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql STABLE;