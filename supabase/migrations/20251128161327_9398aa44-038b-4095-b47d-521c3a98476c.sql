-- Drop existing function with old signature first
DROP FUNCTION IF EXISTS public.calculate_fantasy_scores_batch(jsonb, timestamptz, timestamptz);

-- Fix calculate_fantasy_scores_batch function:
-- 1. Clean sweeps: Only count for BO2+ matches (number_of_games >= 2)
-- 2. Map wins: Only count the winning team's maps, not both teams' scores

CREATE OR REPLACE FUNCTION public.calculate_fantasy_scores_batch(
  team_data jsonb,
  start_date timestamptz,
  end_date timestamptz
)
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
SET search_path = public
AS $$
BEGIN
  -- Process pro teams from pandascore_matches
  RETURN QUERY
  WITH teams AS (
    SELECT 
      t->>'id' as tid,
      t->>'name' as tname,
      COALESCE(t->>'type', 'pro') as ttype
    FROM jsonb_array_elements(team_data) t
    WHERE COALESCE(t->>'type', 'pro') = 'pro'
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
      pm.league_name,
      pm.number_of_games
    FROM teams pt
    CROSS JOIN pandascore_matches pm
    WHERE pm.status = 'finished'
      AND pm.start_time >= start_date
      AND pm.start_time <= end_date
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
      -- FIX: Only count winning team's map wins, not both teams
      COALESCE(SUM(
        CASE WHEN winner_id::text = tid THEN
          (SELECT (r->>'score')::integer 
           FROM jsonb_array_elements(raw_data->'results') r 
           WHERE r->>'team_id' = tid 
           LIMIT 1)
        ELSE 0
        END
      ), 0)::integer as map_wins,
      -- FIX: Clean sweep requires BO2+ (number_of_games >= 2) AND opponent score = 0 AND team score >= 2
      COUNT(*) FILTER (
        WHERE winner_id::text = tid 
        AND COALESCE(number_of_games, 1) >= 2
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
          OR lower(coalesce(tournament_name, '')) LIKE '%major%'
          OR lower(coalesce(league_name, '')) LIKE '%championship%'
          OR lower(coalesce(league_name, '')) LIKE '%major%'
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
    FROM jsonb_array_elements(team_data) t
    WHERE COALESCE(t->>'type', 'pro') = 'amateur'
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
      AND fm.started_at >= start_date
      AND fm.started_at <= end_date
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
      -- FIX: Only count winning team's map wins
      COALESCE(SUM(
        CASE 
          WHEN lower(coalesce(faceit_data->'results'->>'winner', raw_data->'results'->>'winner', '')) = team_faction THEN
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
          ELSE 0
        END
      ), 0)::integer as map_wins,
      -- Clean sweep: team won, team score >= 2, opponent score = 0
      COUNT(*) FILTER (
        WHERE lower(coalesce(faceit_data->'results'->>'winner', raw_data->'results'->>'winner', '')) = team_faction
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