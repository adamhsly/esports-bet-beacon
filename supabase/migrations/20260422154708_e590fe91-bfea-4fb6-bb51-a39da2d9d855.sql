-- ============================================================
-- 1. Richer player-history view (sourced directly from matches)
-- ============================================================
DROP VIEW IF EXISTS public.trivia_top_tier_player_history CASCADE;

CREATE VIEW public.trivia_top_tier_player_history AS
WITH base AS (
  SELECT
    m.match_id,
    m.esport_type AS esport,
    m.start_time,
    EXTRACT(YEAR FROM COALESCE(m.start_time, (m.raw_data->'serie'->>'begin_at')::timestamptz))::int AS year,
    m.tournament_id,
    m.league_id,
    NULLIF(m.raw_data->'serie'->>'id','')        AS serie_id,
    NULLIF(m.raw_data->'serie'->>'full_name','') AS serie_name,
    NULLIF(m.raw_data->'league'->>'name','')     AS league_name,
    NULLIF(m.raw_data->'tournament'->>'tier','') AS tier,
    NULLIF(((COALESCE(m.teams,'[]'::jsonb) -> 0) -> 'opponent') ->> 'id','') AS team_a_id,
    NULLIF(((COALESCE(m.teams,'[]'::jsonb) -> 1) -> 'opponent') ->> 'id','') AS team_b_id,
    COALESCE(m.team_a_player_ids, '[]'::jsonb) AS team_a_pids,
    COALESCE(m.team_b_player_ids, '[]'::jsonb) AS team_b_pids
  FROM public.pandascore_matches m
  WHERE m.raw_data->'tournament'->>'tier' IN ('s','a')
    AND m.esport_type IS NOT NULL
)
SELECT
  esport, match_id, start_time, year,
  tournament_id, league_id, league_name, serie_id, serie_name, tier,
  pid AS player_id,
  team_a_id AS team_id,
  team_b_id AS opponent_team_id,
  team_a_pids AS teammate_ids
FROM base, LATERAL jsonb_array_elements_text(team_a_pids) AS pid
WHERE team_a_id IS NOT NULL
UNION ALL
SELECT
  esport, match_id, start_time, year,
  tournament_id, league_id, league_name, serie_id, serie_name, tier,
  pid AS player_id,
  team_b_id AS team_id,
  team_a_id AS opponent_team_id,
  team_b_pids AS teammate_ids
FROM base, LATERAL jsonb_array_elements_text(team_b_pids) AS pid
WHERE team_b_id IS NOT NULL;

COMMENT ON VIEW public.trivia_top_tier_player_history IS
  'Per-(player,match) row for Tier S/A matches with player-team mapping, opponent, year, serie/league metadata, and roster for teammate detection.';

-- Recreate the teams view (was dropped via CASCADE)
CREATE OR REPLACE VIEW public.trivia_top_tier_teams AS
SELECT
  m.esport_type AS esport,
  ((elem.value -> 'opponent') ->> 'id')   AS team_id,
  ((elem.value -> 'opponent') ->> 'name') AS team_name,
  COUNT(*)        AS appearances,
  MAX(m.raw_data->'tournament'->>'tier') AS best_tier
FROM public.pandascore_matches m
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(m.teams, '[]'::jsonb)) AS elem
WHERE m.raw_data->'tournament'->>'tier' IN ('s','a')
  AND elem.value ? 'opponent'
  AND ((elem.value->'opponent')->>'id') IS NOT NULL
  AND ((elem.value->'opponent')->>'name') IS NOT NULL
GROUP BY m.esport_type, team_id, team_name;

-- ============================================================
-- 2. Recognizable tournament-series view (used for tournament clues)
-- ============================================================
CREATE OR REPLACE VIEW public.trivia_top_tier_series AS
SELECT
  m.esport_type AS esport,
  NULLIF(m.raw_data->'serie'->>'id','')        AS serie_id,
  NULLIF(m.raw_data->'serie'->>'full_name','') AS serie_name,
  NULLIF(m.raw_data->'league'->>'name','')     AS league_name,
  EXTRACT(YEAR FROM COALESCE(m.start_time, (m.raw_data->'serie'->>'begin_at')::timestamptz))::int AS year,
  MAX(m.raw_data->'tournament'->>'tier') AS best_tier,
  COUNT(*) AS match_count
FROM public.pandascore_matches m
WHERE m.raw_data->'tournament'->>'tier' IN ('s','a')
  AND m.raw_data->'serie'->>'full_name' IS NOT NULL
GROUP BY m.esport_type,
         NULLIF(m.raw_data->'serie'->>'id',''),
         NULLIF(m.raw_data->'serie'->>'full_name',''),
         NULLIF(m.raw_data->'league'->>'name',''),
         EXTRACT(YEAR FROM COALESCE(m.start_time, (m.raw_data->'serie'->>'begin_at')::timestamptz))::int;

-- ============================================================
-- 3. Extend trivia_clues with generator metadata
-- ============================================================
ALTER TABLE public.trivia_clues
  ADD COLUMN IF NOT EXISTS valid_answer_count integer,
  ADD COLUMN IF NOT EXISTS difficulty_band    text,
  ADD COLUMN IF NOT EXISTS tier               text,
  ADD COLUMN IF NOT EXISTS source_videogame   text,
  ADD COLUMN IF NOT EXISTS is_generated       boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.trivia_clues DROP CONSTRAINT IF EXISTS trivia_clues_difficulty_band_check;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
  ALTER TABLE public.trivia_clues
    ADD CONSTRAINT trivia_clues_difficulty_band_check
    CHECK (difficulty_band IS NULL OR difficulty_band IN ('easy','medium','hard'));
END$$;

CREATE INDEX IF NOT EXISTS trivia_clues_esport_active_idx
  ON public.trivia_clues (esport, is_active);
CREATE INDEX IF NOT EXISTS trivia_clues_difficulty_idx
  ON public.trivia_clues (difficulty_band);

-- Allow new clue types
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.trivia_clues DROP CONSTRAINT IF EXISTS trivia_clues_clue_type_check;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
  ALTER TABLE public.trivia_clues
    ADD CONSTRAINT trivia_clues_clue_type_check
    CHECK (clue_type IN ('team','nationality','tournament','role','attribute','league','year','teammate','faced'));
END$$;

-- ============================================================
-- 4. Extend grid templates with quality + board difficulty
-- ============================================================
ALTER TABLE public.trivia_grid_templates
  ADD COLUMN IF NOT EXISTS quality_score      numeric,
  ADD COLUMN IF NOT EXISTS board_difficulty   text,
  ADD COLUMN IF NOT EXISTS cell_min_answers   integer,
  ADD COLUMN IF NOT EXISTS avg_cell_answers   numeric,
  ADD COLUMN IF NOT EXISTS is_generated       boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.trivia_grid_templates DROP CONSTRAINT IF EXISTS trivia_grid_templates_difficulty_check;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
  ALTER TABLE public.trivia_grid_templates
    ADD CONSTRAINT trivia_grid_templates_difficulty_check
    CHECK (board_difficulty IS NULL OR board_difficulty IN ('easy','medium','hard'));
END$$;

CREATE INDEX IF NOT EXISTS trivia_grid_templates_esport_active_idx
  ON public.trivia_grid_templates (esport, is_active);

-- ============================================================
-- 5. Extend player matching for year / teammate / faced
-- ============================================================
CREATE OR REPLACE FUNCTION public.trivia_clue_matches_player(
  _player_id bigint, _clue_type text, _clue_value text
) RETURNS boolean
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS
$function$
DECLARE
  _ok boolean := false;
BEGIN
  IF _clue_type = 'team' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.trivia_top_tier_player_history h
      WHERE h.player_id = _player_id::text AND h.team_id = _clue_value
    ) OR EXISTS (
      SELECT 1 FROM public.pandascore_players_master
      WHERE id = _player_id AND current_team_id::text = _clue_value
    ) INTO _ok;

  ELSIF _clue_type = 'faced' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.trivia_top_tier_player_history h
      WHERE h.player_id = _player_id::text AND h.opponent_team_id = _clue_value
    ) INTO _ok;

  ELSIF _clue_type = 'teammate' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.trivia_top_tier_player_history h
      WHERE h.player_id = _player_id::text
        AND h.teammate_ids ? _clue_value
        AND _player_id::text <> _clue_value
    ) INTO _ok;

  ELSIF _clue_type = 'year' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.trivia_top_tier_player_history h
      WHERE h.player_id = _player_id::text AND h.year::text = _clue_value
    ) INTO _ok;

  ELSIF _clue_type = 'nationality' THEN
    SELECT EXISTS (SELECT 1 FROM public.pandascore_players_master
      WHERE id = _player_id AND nationality = _clue_value) INTO _ok;

  ELSIF _clue_type = 'role' THEN
    SELECT EXISTS (SELECT 1 FROM public.pandascore_players_master
      WHERE id = _player_id AND role = _clue_value) INTO _ok;

  ELSIF _clue_type = 'tournament' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.trivia_top_tier_player_history h
      WHERE h.player_id = _player_id::text AND h.serie_id = _clue_value
    ) OR EXISTS (
      SELECT 1 FROM public.trivia_top_tier_player_history h
      WHERE h.player_id = _player_id::text AND h.tournament_id = _clue_value
    ) INTO _ok;

  ELSIF _clue_type = 'league' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.trivia_top_tier_player_history h
      WHERE h.player_id = _player_id::text
        AND (h.league_id = _clue_value OR h.league_name = _clue_value)
    ) INTO _ok;

  ELSIF _clue_type = 'attribute' THEN
    SELECT EXISTS (SELECT 1 FROM public.pandascore_players_master p
      WHERE p.id = _player_id
        AND (p.role = _clue_value OR p.nationality = _clue_value OR p.videogame_name = _clue_value)
    ) INTO _ok;
  END IF;

  RETURN COALESCE(_ok, false);
END;
$function$;

-- ============================================================
-- 6. Helper RPCs for the generator
-- ============================================================
CREATE OR REPLACE FUNCTION public.trivia_count_clue_answers(
  _esport text, _clue_type text, _clue_value text
) RETURNS integer
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$
  WITH eligible AS (
    SELECT DISTINCT p.id
    FROM public.pandascore_players_master p
    WHERE p.active = true AND p.videogame_name = _esport
  )
  SELECT COUNT(*)::int
  FROM eligible e
  WHERE public.trivia_clue_matches_player(e.id, _clue_type, _clue_value);
$$;

CREATE OR REPLACE FUNCTION public.trivia_count_intersection(
  _esport text,
  _row_type text, _row_value text,
  _col_type text, _col_value text
) RETURNS integer
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$
  WITH eligible AS (
    SELECT DISTINCT p.id
    FROM public.pandascore_players_master p
    WHERE p.active = true AND p.videogame_name = _esport
  )
  SELECT COUNT(*)::int
  FROM eligible e
  WHERE public.trivia_clue_matches_player(e.id, _row_type, _row_value)
    AND public.trivia_clue_matches_player(e.id, _col_type, _col_value);
$$;

GRANT EXECUTE ON FUNCTION public.trivia_count_clue_answers(text,text,text)        TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.trivia_count_intersection(text,text,text,text,text) TO anon, authenticated, service_role;