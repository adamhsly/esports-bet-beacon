-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS public.calculate_fantasy_scores_batch(uuid, uuid);

-- Recreate with tournaments_won in return type and tracking logic
CREATE OR REPLACE FUNCTION public.calculate_fantasy_scores_batch(
  p_round_id uuid,
  p_user_id uuid
)
RETURNS TABLE (
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
SET search_path TO 'public'
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
      COUNT(*) FILTER (WHERE winner_id = tid)::integer as match_wins,
      COALESCE(SUM(
        CASE 
          WHEN winner_id = tid THEN
            (SELECT (t->'score')::integer FROM jsonb_array_elements(teams) t WHERE t->'opponent'->>'id' = tid LIMIT 1)
          ELSE
            (SELECT (t->'score')::integer FROM jsonb_array_elements(teams) t WHERE t->'opponent'->>'id' = tid LIMIT 1)
        END
      ), 0)::integer as map_wins,
      COUNT(*) FILTER (
        WHERE winner_id = tid 
        AND (SELECT (t->'score')::integer FROM jsonb_array_elements(teams) t WHERE t->'opponent'->>'id' != tid LIMIT 1) = 0
      )::integer as clean_sweeps,
      COUNT(*) FILTER (
        WHERE winner_id = tid 
        AND (
          lower(coalesce(tournament_name, '')) LIKE '%championship%'
          OR lower(coalesce(tournament_name, '')) LIKE '%major%'
          OR lower(coalesce(tournament_name, '')) LIKE '%final%'
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
      fm.teams,
      fm.faceit_data,
      fm.raw_data,
      fm.faction1_name,
      fm.faction2_name,
      fm.competition_type,
      fm.competition_name,
      CASE 
        WHEN fm.faction1_name = at.tname THEN 'faction1'
        ELSE 'faction2'
      END as team_faction
    FROM amateur_teams at
    CROSS JOIN faceit_matches fm
    WHERE fm.is_finished = true
      AND fm.started_at >= v_start_date
      AND fm.started_at <= v_end_date
      AND (fm.faction1_name = at.tname OR fm.faction2_name = at.tname)
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
          WHEN 'faction1' THEN coalesce((faceit_data->'results'->>'score_faction1')::integer, (raw_data->'results'->>'score_faction1')::integer, 0)
          ELSE coalesce((faceit_data->'results'->>'score_faction2')::integer, (raw_data->'results'->>'score_faction2')::integer, 0)
        END
      ), 0)::integer as map_wins,
      COUNT(*) FILTER (
        WHERE lower(coalesce(faceit_data->'results'->>'winner', raw_data->'results'->>'winner', '')) = team_faction
        AND (
          CASE team_faction
            WHEN 'faction1' THEN coalesce((faceit_data->'results'->>'score_faction2')::integer, (raw_data->'results'->>'score_faction2')::integer, 0)
            ELSE coalesce((faceit_data->'results'->>'score_faction1')::integer, (raw_data->'results'->>'score_faction1')::integer, 0)
          END
        ) = 0
      )::integer as clean_sweeps,
      COUNT(*) FILTER (
        WHERE lower(coalesce(faceit_data->'results'->>'winner', raw_data->'results'->>'winner', '')) = team_faction
        AND (
          lower(coalesce(competition_type, '')) = 'championship'
          OR lower(coalesce(competition_name, '')) LIKE '%championship%'
          OR lower(coalesce(competition_name, '')) LIKE '%major%'
          OR lower(coalesce(competition_name, '')) LIKE '%final%'
        )
      )::integer as tournaments_won,
      COUNT(*)::integer as matches_played
    FROM amateur_matches
    GROUP BY tid, tname, ttype
  )
  SELECT * FROM amateur_stats;
END;
$$;