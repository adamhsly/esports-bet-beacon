
-- Materialized cache for top-tier player history (avoids re-scanning pandascore_matches 7x per refresh)
CREATE TABLE IF NOT EXISTS public.trivia_player_history_cache (
  esport text NOT NULL,
  match_id text NOT NULL,
  player_id text NOT NULL,
  team_id text,
  opponent_team_id text,
  serie_id text,
  league_name text,
  year integer,
  teammate_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY (esport, match_id, player_id, team_id)
);

ALTER TABLE public.trivia_player_history_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read trivia_player_history_cache" ON public.trivia_player_history_cache;
CREATE POLICY "Admins read trivia_player_history_cache"
ON public.trivia_player_history_cache
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_tphc_esport_player ON public.trivia_player_history_cache (esport, player_id);
CREATE INDEX IF NOT EXISTS idx_tphc_esport_team ON public.trivia_player_history_cache (esport, team_id);
CREATE INDEX IF NOT EXISTS idx_tphc_esport_serie ON public.trivia_player_history_cache (esport, serie_id);
CREATE INDEX IF NOT EXISTS idx_tphc_esport_league ON public.trivia_player_history_cache (esport, league_name);

-- Rebuild the cache for a single esport in one pass (no JSON re-parsing across multiple inserts)
CREATE OR REPLACE FUNCTION public.trivia_rebuild_player_history_cache(_esport text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _n integer := 0;
BEGIN
  IF _esport IS NULL THEN
    RAISE EXCEPTION 'esport is required';
  END IF;

  DELETE FROM public.trivia_player_history_cache WHERE esport = _esport;

  WITH base AS (
    SELECT
      m.match_id,
      m.esport_type AS esport,
      EXTRACT(year FROM COALESCE(m.start_time, ((m.raw_data -> 'serie') ->> 'begin_at')::timestamptz))::integer AS year,
      NULLIF((m.raw_data -> 'serie') ->> 'id', '') AS serie_id,
      NULLIF((m.raw_data -> 'league') ->> 'name', '') AS league_name,
      NULLIF(((COALESCE(m.teams, '[]'::jsonb) -> 0) -> 'opponent') ->> 'id', '') AS team_a_id,
      NULLIF(((COALESCE(m.teams, '[]'::jsonb) -> 1) -> 'opponent') ->> 'id', '') AS team_b_id,
      COALESCE(m.team_a_player_ids, '[]'::jsonb) AS team_a_pids,
      COALESCE(m.team_b_player_ids, '[]'::jsonb) AS team_b_pids
    FROM public.pandascore_matches m
    WHERE m.esport_type = _esport
      AND ((m.raw_data -> 'tournament') ->> 'tier') IN ('s','a')
  ),
  side_a AS (
    SELECT b.esport, b.match_id, pid.value AS player_id,
           b.team_a_id AS team_id, b.team_b_id AS opponent_team_id,
           b.serie_id, b.league_name, b.year, b.team_a_pids AS teammate_ids
    FROM base b, LATERAL jsonb_array_elements_text(b.team_a_pids) AS pid(value)
    WHERE b.team_a_id IS NOT NULL
  ),
  side_b AS (
    SELECT b.esport, b.match_id, pid.value AS player_id,
           b.team_b_id AS team_id, b.team_a_id AS opponent_team_id,
           b.serie_id, b.league_name, b.year, b.team_b_pids AS teammate_ids
    FROM base b, LATERAL jsonb_array_elements_text(b.team_b_pids) AS pid(value)
    WHERE b.team_b_id IS NOT NULL
  )
  INSERT INTO public.trivia_player_history_cache
    (esport, match_id, player_id, team_id, opponent_team_id, serie_id, league_name, year, teammate_ids)
  SELECT esport, match_id, player_id, team_id, opponent_team_id, serie_id, league_name, year, teammate_ids
  FROM side_a
  UNION ALL
  SELECT esport, match_id, player_id, team_id, opponent_team_id, serie_id, league_name, year, teammate_ids
  FROM side_b
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END
$$;

-- Faster refresh: reads from the cache (already materialized) instead of re-parsing JSON 7x
CREATE OR REPLACE FUNCTION public.trivia_refresh_player_clue_index(_esport text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _n integer := 0;
  _esports text[];
  _e text;
BEGIN
  IF _esport IS NULL THEN
    SELECT ARRAY(SELECT DISTINCT esport_type FROM public.pandascore_matches
                 WHERE ((raw_data -> 'tournament') ->> 'tier') IN ('s','a')
                   AND esport_type IS NOT NULL) INTO _esports;
  ELSE
    _esports := ARRAY[_esport];
  END IF;

  FOREACH _e IN ARRAY _esports LOOP
    -- Step 1: rebuild materialized history cache for this esport
    PERFORM public.trivia_rebuild_player_history_cache(_e);

    -- Step 2: clear existing index entries for this esport
    DELETE FROM public.trivia_player_clue_index WHERE esport = _e;

    -- Step 3: populate clue index from cache (single pass per clue type, all small/fast)
    INSERT INTO public.trivia_player_clue_index (esport, player_id, clue_type, clue_value)
    SELECT DISTINCT h.esport, p.id, 'team', h.team_id
    FROM public.trivia_player_history_cache h
    JOIN public.pandascore_players_master p
      ON p.id::text = h.player_id AND p.active AND p.videogame_name = h.esport
    WHERE h.esport = _e AND h.team_id IS NOT NULL
    ON CONFLICT DO NOTHING;

    INSERT INTO public.trivia_player_clue_index (esport, player_id, clue_type, clue_value)
    SELECT DISTINCT p.videogame_name, p.id, 'team', p.current_team_id::text
    FROM public.pandascore_players_master p
    WHERE p.active AND p.current_team_id IS NOT NULL AND p.videogame_name = _e
    ON CONFLICT DO NOTHING;

    INSERT INTO public.trivia_player_clue_index (esport, player_id, clue_type, clue_value)
    SELECT DISTINCT h.esport, p.id, 'faced', h.opponent_team_id
    FROM public.trivia_player_history_cache h
    JOIN public.pandascore_players_master p
      ON p.id::text = h.player_id AND p.active AND p.videogame_name = h.esport
    WHERE h.esport = _e AND h.opponent_team_id IS NOT NULL
    ON CONFLICT DO NOTHING;

    INSERT INTO public.trivia_player_clue_index (esport, player_id, clue_type, clue_value)
    SELECT DISTINCT h.esport, p.id, 'teammate', mate.value
    FROM public.trivia_player_history_cache h
    JOIN public.pandascore_players_master p
      ON p.id::text = h.player_id AND p.active AND p.videogame_name = h.esport
    CROSS JOIN LATERAL jsonb_array_elements_text(h.teammate_ids) AS mate
    WHERE h.esport = _e AND mate.value <> p.id::text
    ON CONFLICT DO NOTHING;

    INSERT INTO public.trivia_player_clue_index (esport, player_id, clue_type, clue_value)
    SELECT DISTINCT h.esport, p.id, 'year', h.year::text
    FROM public.trivia_player_history_cache h
    JOIN public.pandascore_players_master p
      ON p.id::text = h.player_id AND p.active AND p.videogame_name = h.esport
    WHERE h.esport = _e AND h.year IS NOT NULL
    ON CONFLICT DO NOTHING;

    INSERT INTO public.trivia_player_clue_index (esport, player_id, clue_type, clue_value)
    SELECT DISTINCT h.esport, p.id, 'tournament', h.serie_id
    FROM public.trivia_player_history_cache h
    JOIN public.pandascore_players_master p
      ON p.id::text = h.player_id AND p.active AND p.videogame_name = h.esport
    WHERE h.esport = _e AND h.serie_id IS NOT NULL
    ON CONFLICT DO NOTHING;

    INSERT INTO public.trivia_player_clue_index (esport, player_id, clue_type, clue_value)
    SELECT DISTINCT h.esport, p.id, 'league', h.league_name
    FROM public.trivia_player_history_cache h
    JOIN public.pandascore_players_master p
      ON p.id::text = h.player_id AND p.active AND p.videogame_name = h.esport
    WHERE h.esport = _e AND h.league_name IS NOT NULL
    ON CONFLICT DO NOTHING;

    INSERT INTO public.trivia_player_clue_index (esport, player_id, clue_type, clue_value)
    SELECT DISTINCT p.videogame_name, p.id, 'nationality', p.nationality
    FROM public.pandascore_players_master p
    WHERE p.active AND p.nationality IS NOT NULL AND p.videogame_name = _e
      AND EXISTS (SELECT 1 FROM public.trivia_player_history_cache h
                  WHERE h.player_id = p.id::text AND h.esport = _e)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.trivia_player_clue_index (esport, player_id, clue_type, clue_value)
    SELECT DISTINCT p.videogame_name, p.id, 'role', p.role
    FROM public.pandascore_players_master p
    WHERE p.active AND p.role IS NOT NULL AND p.videogame_name = _e
      AND EXISTS (SELECT 1 FROM public.trivia_player_history_cache h
                  WHERE h.player_id = p.id::text AND h.esport = _e)
    ON CONFLICT DO NOTHING;

    -- Trim entries for players that don't exist in the history cache for this esport
    DELETE FROM public.trivia_player_clue_index pci
    WHERE pci.esport = _e
      AND NOT EXISTS (
        SELECT 1 FROM public.trivia_player_history_cache h
        WHERE h.esport = _e AND h.player_id = pci.player_id::text
      );
  END LOOP;

  IF _esport IS NULL THEN
    SELECT COUNT(*) INTO _n FROM public.trivia_player_clue_index;
  ELSE
    SELECT COUNT(*) INTO _n FROM public.trivia_player_clue_index WHERE esport = _esport;
  END IF;

  RETURN _n;
END
$$;
