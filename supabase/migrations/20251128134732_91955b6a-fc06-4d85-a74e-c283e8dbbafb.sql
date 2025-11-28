
-- Fix calculate_fantasy_scores_batch to use raw_data.results for pro team map scores (matching edge function)
DROP FUNCTION IF EXISTS calculate_fantasy_scores_batch(uuid, uuid);

CREATE OR REPLACE FUNCTION calculate_fantasy_scores_batch(p_round_id uuid, p_user_id uuid)
RETURNS TABLE(
  team_id text,
  team_name text,
  team_type text,
  match_wins integer,
  map_wins integer,
  clean_sweeps integer,
  tournaments_won integer,
  matches_played integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date timestamptz;
  v_end_date timestamptz;
  v_team_picks jsonb;
BEGIN
  -- Get round dates
  SELECT start_date, end_date INTO v_start_date, v_end_date
  FROM fantasy_rounds WHERE id = p_round_id;

  -- Get user's team picks
  SELECT frp.team_picks INTO v_team_picks
  FROM fantasy_round_picks frp
  WHERE frp.round_id = p_round_id AND frp.user_id = p_user_id;

  IF v_team_picks IS NULL THEN
    RETURN;
  END IF;

  -- Process pro teams from pandascore_matches
  RETURN QUERY
  WITH pro_teams AS (
    SELECT 
      t->>'id' as tid,
      t->>'name' as tname,
      'pro' as ttype
    FROM jsonb_array_elements(v_team_picks->'pro') t
  ),
  pro_matches AS (
    SELECT 
      pt.tid,
      pt.tname,
      pt.ttype,
      pm.match_id,
      pm.teams,
      pm.raw_data,
      pm.winner_id,
      pm.tournament_name,
      pm.league_name
    FROM pro_teams pt
    CROSS JOIN pandascore_matches pm
    WHERE pm.status = 'finished'
      AND pm.start_time >= v_start_date
      AND pm.start_time <= v_end_date
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(pm.teams) t
        WHERE t->'opponent'->>'id' = pt.tid
      )
  ),
  pro_stats AS (
    SELECT 
      tid as team_id,
      tname as team_name,
      ttype as team_type,
      COUNT(*) FILTER (WHERE winner_id::text = tid)::integer as match_wins,
      -- Get map wins from raw_data.results (same as edge function)
      COALESCE(SUM(
        (SELECT (r->>'score')::integer 
         FROM jsonb_array_elements(raw_data->'results') r 
         WHERE r->>'team_id' = tid 
         LIMIT 1)
      ), 0)::integer as map_wins,
      -- Clean sweep: win with opponent score = 0 and team score >= 2
      COUNT(*) FILTER (
        WHERE winner_id::text = tid 
        AND (SELECT (r->>'score')::integer 
             FROM jsonb_array_elements(raw_data->'results') r 
             WHERE r->>'team_id' != tid 
             LIMIT 1) = 0
        AND (SELECT (r->>'score')::integer 
             FROM jsonb_array_elements(raw_data->'results') r 
             WHERE r->>'team_id' = tid 
             LIMIT 1) >= 2
      )::integer as clean_sweeps,
      COUNT(*) FILTER (
        WHERE winner_id::text = tid 
        AND (
          lower(coalesce(tournament_name, '')) LIKE '%championship%'
          OR lower(coalesce(tournament_name, '')) LIKE '%final%'
          OR lower(coalesce(tournament_name, '')) LIKE '%cup%'
          OR lower(coalesce(league_name, '')) LIKE '%championship%'
        )
      )::integer as tournaments_won,
      COUNT(*)::integer as matches_played
    FROM pro_matches
    GROUP BY tid, tname, ttype
  )
  SELECT * FROM pro_stats;

  -- Process amateur teams from faceit_matches
  RETURN QUERY
  WITH amateur_teams AS (
    SELECT 
      t->>'id' as tid,
      t->>'name' as tname,
      'amateur' as ttype
    FROM jsonb_array_elements(v_team_picks->'amateur') t
  ),
  amateur_matches AS (
    SELECT 
      at.tid,
      at.tname,
      at.ttype,
      fm.match_id,
      fm.faceit_data,
      fm.raw_data,
      fm.faction1_name,
      fm.faction2_name,
      fm.competition_type,
      CASE 
        WHEN lower(fm.faction1_name) = lower(at.tname) THEN 'faction1'
        ELSE 'faction2'
      END as team_faction
    FROM amateur_teams at
    CROSS JOIN faceit_matches fm
    WHERE fm.is_finished = true
      AND fm.started_at >= v_start_date
      AND fm.started_at <= v_end_date
      AND (lower(fm.faction1_name) = lower(at.tname) OR lower(fm.faction2_name) = lower(at.tname))
  ),
  amateur_stats AS (
    SELECT 
      tid as team_id,
      tname as team_name,
      ttype as team_type,
      COUNT(*) FILTER (
        WHERE lower(coalesce(faceit_data->'results'->>'winner', raw_data->'results'->>'winner', '')) = team_faction
      )::integer as match_wins,
      COALESCE(SUM(
        CASE team_faction
          WHEN 'faction1' THEN coalesce(
            (faceit_data->'results'->'score'->>'faction1')::integer,
            (raw_data->'results'->'score'->>'faction1')::integer, 
            0
          )
          ELSE coalesce(
            (faceit_data->'results'->'score'->>'faction2')::integer,
            (raw_data->'results'->'score'->>'faction2')::integer, 
            0
          )
        END
      ), 0)::integer as map_wins,
      -- Clean sweep: win with opponent score = 0 and team score >= 2
      COUNT(*) FILTER (
        WHERE lower(coalesce(faceit_data->'results'->>'winner', raw_data->'results'->>'winner', '')) = team_faction
        AND (
          CASE team_faction
            WHEN 'faction1' THEN coalesce(
              (faceit_data->'results'->'score'->>'faction2')::integer,
              (raw_data->'results'->'score'->>'faction2')::integer, 
              0
            )
            ELSE coalesce(
              (faceit_data->'results'->'score'->>'faction1')::integer,
              (raw_data->'results'->'score'->>'faction1')::integer, 
              0
            )
          END
        ) = 0
        AND (
          CASE team_faction
            WHEN 'faction1' THEN coalesce(
              (faceit_data->'results'->'score'->>'faction1')::integer,
              (raw_data->'results'->'score'->>'faction1')::integer, 
              0
            )
            ELSE coalesce(
              (faceit_data->'results'->'score'->>'faction2')::integer,
              (raw_data->'results'->'score'->>'faction2')::integer, 
              0
            )
          END
        ) >= 2
      )::integer as clean_sweeps,
      COUNT(*) FILTER (
        WHERE lower(coalesce(faceit_data->'results'->>'winner', raw_data->'results'->>'winner', '')) = team_faction
        AND competition_type = 'championship'
      )::integer as tournaments_won,
      COUNT(*)::integer as matches_played
    FROM amateur_matches
    GROUP BY tid, tname, ttype
  )
  SELECT * FROM amateur_stats;
END;
$$;
