-- Drop and recreate the function with the correct signature to include tournaments_won
DROP FUNCTION IF EXISTS public.calculate_fantasy_scores_batch(jsonb, timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION public.calculate_fantasy_scores_batch(
  team_data jsonb, 
  start_date timestamp with time zone, 
  end_date timestamp with time zone
)
RETURNS TABLE (
  team_id text, 
  team_name text, 
  match_wins bigint, 
  map_wins bigint, 
  clean_sweeps bigint, 
  tournaments_won bigint,
  matches_played bigint
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH teams AS (
    SELECT 
      (t->>'team_id')::text AS tid,
      (t->>'team_name')::text AS tname,
      (t->>'team_type')::text AS ttype
    FROM jsonb_array_elements(team_data) AS t
  ),
  -- Pro team scores from pandascore_matches
  pro_scores AS (
    SELECT 
      t.tid AS team_id,
      t.tname AS team_name,
      COUNT(*) FILTER (WHERE pm.winner_id = t.tid) AS match_wins,
      COALESCE(SUM(
        CASE 
          WHEN pm.winner_id = t.tid THEN
            COALESCE((pm.teams->0->'score')::int, 0) + COALESCE((pm.teams->1->'score')::int, 0)
          ELSE 0
        END
      ), 0) AS map_wins,
      COUNT(*) FILTER (
        WHERE pm.winner_id = t.tid 
        AND (
          (COALESCE((pm.teams->0->'score')::int, 0) = 0 AND pm.winner_id = (pm.teams->1->'opponent'->>'id'))
          OR (COALESCE((pm.teams->1->'score')::int, 0) = 0 AND pm.winner_id = (pm.teams->0->'opponent'->>'id'))
        )
      ) AS clean_sweeps,
      COUNT(*) FILTER (
        WHERE pm.winner_id = t.tid 
        AND (
          lower(coalesce(pm.tournament_name, '')) ~ '(championship|major|final|grand final)'
          OR lower(coalesce(pm.league_name, '')) ~ '(championship|major|final)'
        )
      ) AS tournaments_won,
      COUNT(*) AS matches_played
    FROM teams t
    LEFT JOIN pandascore_matches pm ON (
      t.ttype = 'pro'
      AND pm.status = 'finished'
      AND pm.start_time >= start_date
      AND pm.start_time <= end_date
      AND (
        pm.teams->0->'opponent'->>'id' = t.tid
        OR pm.teams->1->'opponent'->>'id' = t.tid
      )
    )
    WHERE t.ttype = 'pro'
    GROUP BY t.tid, t.tname
  ),
  -- Amateur team scores from faceit_matches
  amateur_scores AS (
    SELECT 
      t.tid AS team_id,
      t.tname AS team_name,
      COUNT(*) FILTER (
        WHERE (
          (fm.faction1_name = t.tname AND lower(coalesce(fm.faceit_data->'results'->>'winner', fm.raw_data->'results'->>'winner', '')) = 'faction1')
          OR (fm.faction2_name = t.tname AND lower(coalesce(fm.faceit_data->'results'->>'winner', fm.raw_data->'results'->>'winner', '')) = 'faction2')
        )
      ) AS match_wins,
      COALESCE(SUM(
        CASE 
          WHEN fm.faction1_name = t.tname AND lower(coalesce(fm.faceit_data->'results'->>'winner', fm.raw_data->'results'->>'winner', '')) = 'faction1' THEN
            COALESCE((fm.faceit_data->'results'->'score'->>'faction1')::int, (fm.raw_data->'results'->'score'->>'faction1')::int, 0)
          WHEN fm.faction2_name = t.tname AND lower(coalesce(fm.faceit_data->'results'->>'winner', fm.raw_data->'results'->>'winner', '')) = 'faction2' THEN
            COALESCE((fm.faceit_data->'results'->'score'->>'faction2')::int, (fm.raw_data->'results'->'score'->>'faction2')::int, 0)
          ELSE 0
        END
      ), 0) AS map_wins,
      COUNT(*) FILTER (
        WHERE (
          (fm.faction1_name = t.tname AND lower(coalesce(fm.faceit_data->'results'->>'winner', fm.raw_data->'results'->>'winner', '')) = 'faction1'
            AND COALESCE((fm.faceit_data->'results'->'score'->>'faction2')::int, (fm.raw_data->'results'->'score'->>'faction2')::int, 0) = 0)
          OR (fm.faction2_name = t.tname AND lower(coalesce(fm.faceit_data->'results'->>'winner', fm.raw_data->'results'->>'winner', '')) = 'faction2'
            AND COALESCE((fm.faceit_data->'results'->'score'->>'faction1')::int, (fm.raw_data->'results'->'score'->>'faction1')::int, 0) = 0)
        )
      ) AS clean_sweeps,
      COUNT(*) FILTER (
        WHERE (
          (fm.faction1_name = t.tname AND lower(coalesce(fm.faceit_data->'results'->>'winner', fm.raw_data->'results'->>'winner', '')) = 'faction1')
          OR (fm.faction2_name = t.tname AND lower(coalesce(fm.faceit_data->'results'->>'winner', fm.raw_data->'results'->>'winner', '')) = 'faction2')
        )
        AND (
          lower(coalesce(fm.competition_type, '')) = 'championship'
          OR lower(coalesce(fm.competition_name, '')) ~ '(championship|major|final|cup)'
        )
      ) AS tournaments_won,
      COUNT(*) AS matches_played
    FROM teams t
    LEFT JOIN faceit_matches fm ON (
      t.ttype = 'amateur'
      AND fm.is_finished = true
      AND COALESCE(fm.started_at, fm.effective_start, fm.finished_at) >= start_date
      AND COALESCE(fm.started_at, fm.effective_start, fm.finished_at) <= end_date
      AND (fm.faction1_name = t.tname OR fm.faction2_name = t.tname)
    )
    WHERE t.ttype = 'amateur'
    GROUP BY t.tid, t.tname
  )
  -- Combine pro and amateur scores
  SELECT 
    COALESCE(p.team_id, a.team_id) AS team_id,
    COALESCE(p.team_name, a.team_name) AS team_name,
    COALESCE(p.match_wins, 0) + COALESCE(a.match_wins, 0) AS match_wins,
    COALESCE(p.map_wins, 0) + COALESCE(a.map_wins, 0) AS map_wins,
    COALESCE(p.clean_sweeps, 0) + COALESCE(a.clean_sweeps, 0) AS clean_sweeps,
    COALESCE(p.tournaments_won, 0) + COALESCE(a.tournaments_won, 0) AS tournaments_won,
    COALESCE(p.matches_played, 0) + COALESCE(a.matches_played, 0) AS matches_played
  FROM pro_scores p
  FULL OUTER JOIN amateur_scores a ON p.team_id = a.team_id;
END;
$function$;