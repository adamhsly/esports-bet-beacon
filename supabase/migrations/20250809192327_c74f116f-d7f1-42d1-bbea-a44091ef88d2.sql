-- 1) Performance indexes for pandascore_matches
CREATE INDEX IF NOT EXISTS idx_panda_matches_status_start ON public.pandascore_matches (status, start_time);
CREATE INDEX IF NOT EXISTS idx_panda_matches_winner_id ON public.pandascore_matches (winner_id);
CREATE INDEX IF NOT EXISTS idx_panda_matches_teams_gin ON public.pandascore_matches USING GIN (teams);

-- 2) Optimized team stats function using set-based SQL and GIN-contained lookups
CREATE OR REPLACE FUNCTION public.get_team_stats_optimized(team_id text)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  total_matches int := 0;
  wins int := 0;
  losses int := 0;
  tournament_wins int := 0;
  recent_matches_30d int := 0;
  recent_wins_30d int := 0;
  recent_form text := '';
  last_10_matches jsonb := '[]'::jsonb;
  league_perf jsonb := '{}'::jsonb;
  latest_match_id text;
  latest_esport_type text;
  thirty_days_ago timestamp := now() - interval '30 days';
BEGIN
  -- Latest match info for metadata
  SELECT m.match_id, m.esport_type
  INTO latest_match_id, latest_esport_type
  FROM public.pandascore_matches m
  WHERE m.status = 'finished'
    AND m.teams @> jsonb_build_array(jsonb_build_object('opponent', jsonb_build_object('id', team_id)))
  ORDER BY m.start_time DESC
  LIMIT 1;

  -- Totals and wins
  SELECT 
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE winner_id = team_id)::int
  INTO total_matches, wins
  FROM public.pandascore_matches m
  WHERE m.status = 'finished'
    AND m.teams @> jsonb_build_array(jsonb_build_object('opponent', jsonb_build_object('id', team_id)));

  losses := GREATEST(total_matches - wins, 0);

  -- Tournament wins (heuristic maintained)
  SELECT COUNT(*)::int
  INTO tournament_wins
  FROM public.pandascore_matches m
  WHERE m.status = 'finished'
    AND m.winner_id = team_id
    AND m.teams @> jsonb_build_array(jsonb_build_object('opponent', jsonb_build_object('id', team_id)))
    AND (
      lower(coalesce(m.tournament_name, '')) like '%championship%' OR
      lower(coalesce(m.tournament_name, '')) like '%major%' OR
      lower(coalesce(m.league_name, '')) like '%championship%'
    );

  -- Recent 30 days
  SELECT 
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE winner_id = team_id)::int
  INTO recent_matches_30d, recent_wins_30d
  FROM public.pandascore_matches m
  WHERE m.status = 'finished'
    AND m.start_time >= thirty_days_ago
    AND m.teams @> jsonb_build_array(jsonb_build_object('opponent', jsonb_build_object('id', team_id)));

  -- League performance aggregated JSON
  WITH base AS (
    SELECT 
      COALESCE(m.league_name, m.tournament_name, 'Unknown') AS league_key,
      (m.winner_id = team_id)::int AS win
    FROM public.pandascore_matches m
    WHERE m.status = 'finished'
      AND m.teams @> jsonb_build_array(jsonb_build_object('opponent', jsonb_build_object('id', team_id)))
  )
  SELECT COALESCE(
    jsonb_object_agg(league_key, jsonb_build_object('wins', SUM(win), 'total', COUNT(*))),
    '{}'::jsonb
  )
  INTO league_perf
  FROM base
  GROUP BY true;

  -- Recent form string (last 10 results, chronological)
  SELECT COALESCE(
    right(string_agg(CASE WHEN m.winner_id = team_id THEN 'W' ELSE 'L' END, '' ORDER BY m.start_time), 10),
    ''
  )
  INTO recent_form
  FROM public.pandascore_matches m
  WHERE m.status = 'finished'
    AND m.teams @> jsonb_build_array(jsonb_build_object('opponent', jsonb_build_object('id', team_id)));

  -- Last 10 matches detail
  WITH last10 AS (
    SELECT 
      m.match_id,
      (SELECT t->'opponent'->>'name' 
       FROM jsonb_array_elements(m.teams) t 
       WHERE t->'opponent'->>'id' <> team_id
       LIMIT 1) AS opponent_name,
      CASE WHEN m.winner_id = team_id THEN 'W' ELSE 'L' END AS result,
      m.start_time AS date,
      COALESCE(m.tournament_name, m.league_name) AS tournament
    FROM public.pandascore_matches m
    WHERE m.status = 'finished'
      AND m.teams @> jsonb_build_array(jsonb_build_object('opponent', jsonb_build_object('id', team_id)))
    ORDER BY m.start_time DESC
    LIMIT 10
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'matchId', match_id,
    'opponent', opponent_name,
    'result', result,
    'date', date,
    'tournament', tournament
  ) ORDER BY date), '[]'::jsonb)
  INTO last_10_matches
  FROM last10;

  RETURN json_build_object(
    'match_id', latest_match_id,
    'team_id', team_id,
    'esport_type', latest_esport_type,
    'calculated_at', now(),
    'win_rate', CASE WHEN total_matches > 0 THEN round((wins::decimal / total_matches) * 100) ELSE 0 END,
    'recent_form', recent_form,
    'tournament_wins', tournament_wins,
    'total_matches', total_matches,
    'wins', wins,
    'losses', losses,
    'league_performance', league_perf,
    'recent_win_rate_30d', CASE WHEN recent_matches_30d > 0 THEN round((recent_wins_30d::decimal / recent_matches_30d) * 100) ELSE 0 END,
    'last_10_matches_detail', last_10_matches,
    'created_at', now(),
    'updated_at', now()
  );
END;
$function$;