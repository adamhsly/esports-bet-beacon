-- ============================================================
-- Flat materialized index of every (player, clue) relationship
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trivia_player_clue_index (
  esport     text   NOT NULL,
  player_id  bigint NOT NULL,
  clue_type  text   NOT NULL,
  clue_value text   NOT NULL,
  PRIMARY KEY (esport, clue_type, clue_value, player_id)
);

CREATE INDEX IF NOT EXISTS trivia_pci_clue_idx
  ON public.trivia_player_clue_index (esport, clue_type, clue_value);
CREATE INDEX IF NOT EXISTS trivia_pci_player_idx
  ON public.trivia_player_clue_index (esport, player_id);

ALTER TABLE public.trivia_player_clue_index ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Player clue index readable by everyone"
  ON public.trivia_player_clue_index;
CREATE POLICY "Player clue index readable by everyone"
  ON public.trivia_player_clue_index FOR SELECT USING (true);

-- ============================================================
-- Refresh function: rebuild the entire index from source views
-- ============================================================
CREATE OR REPLACE FUNCTION public.trivia_refresh_player_clue_index(_esport text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS
$$
DECLARE _n integer := 0;
BEGIN
  IF _esport IS NULL THEN
    DELETE FROM public.trivia_player_clue_index;
  ELSE
    DELETE FROM public.trivia_player_clue_index WHERE esport = _esport;
  END IF;

  -- TEAM (history + current team)
  INSERT INTO public.trivia_player_clue_index (esport, player_id, clue_type, clue_value)
  SELECT DISTINCT p.videogame_name, p.id, 'team', h.team_id
  FROM public.pandascore_players_master p
  JOIN public.trivia_top_tier_player_history h ON h.player_id = p.id::text
  WHERE p.active AND h.team_id IS NOT NULL
    AND (_esport IS NULL OR p.videogame_name = _esport)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.trivia_player_clue_index (esport, player_id, clue_type, clue_value)
  SELECT DISTINCT p.videogame_name, p.id, 'team', p.current_team_id::text
  FROM public.pandascore_players_master p
  WHERE p.active AND p.current_team_id IS NOT NULL
    AND (_esport IS NULL OR p.videogame_name = _esport)
  ON CONFLICT DO NOTHING;

  -- FACED
  INSERT INTO public.trivia_player_clue_index (esport, player_id, clue_type, clue_value)
  SELECT DISTINCT p.videogame_name, p.id, 'faced', h.opponent_team_id
  FROM public.pandascore_players_master p
  JOIN public.trivia_top_tier_player_history h ON h.player_id = p.id::text
  WHERE p.active AND h.opponent_team_id IS NOT NULL
    AND (_esport IS NULL OR p.videogame_name = _esport)
  ON CONFLICT DO NOTHING;

  -- TEAMMATE
  INSERT INTO public.trivia_player_clue_index (esport, player_id, clue_type, clue_value)
  SELECT DISTINCT p.videogame_name, p.id, 'teammate', mate.value
  FROM public.pandascore_players_master p
  JOIN public.trivia_top_tier_player_history h ON h.player_id = p.id::text
  CROSS JOIN LATERAL jsonb_array_elements_text(h.teammate_ids) AS mate
  WHERE p.active AND mate.value <> p.id::text
    AND (_esport IS NULL OR p.videogame_name = _esport)
  ON CONFLICT DO NOTHING;

  -- YEAR
  INSERT INTO public.trivia_player_clue_index (esport, player_id, clue_type, clue_value)
  SELECT DISTINCT p.videogame_name, p.id, 'year', h.year::text
  FROM public.pandascore_players_master p
  JOIN public.trivia_top_tier_player_history h ON h.player_id = p.id::text
  WHERE p.active AND h.year IS NOT NULL
    AND (_esport IS NULL OR p.videogame_name = _esport)
  ON CONFLICT DO NOTHING;

  -- TOURNAMENT (use serie_id, recognizable edition)
  INSERT INTO public.trivia_player_clue_index (esport, player_id, clue_type, clue_value)
  SELECT DISTINCT p.videogame_name, p.id, 'tournament', h.serie_id
  FROM public.pandascore_players_master p
  JOIN public.trivia_top_tier_player_history h ON h.player_id = p.id::text
  WHERE p.active AND h.serie_id IS NOT NULL
    AND (_esport IS NULL OR p.videogame_name = _esport)
  ON CONFLICT DO NOTHING;

  -- LEAGUE (prefer league_name as canonical value to avoid id/name drift)
  INSERT INTO public.trivia_player_clue_index (esport, player_id, clue_type, clue_value)
  SELECT DISTINCT p.videogame_name, p.id, 'league', h.league_name
  FROM public.pandascore_players_master p
  JOIN public.trivia_top_tier_player_history h ON h.player_id = p.id::text
  WHERE p.active AND h.league_name IS NOT NULL
    AND (_esport IS NULL OR p.videogame_name = _esport)
  ON CONFLICT DO NOTHING;

  -- NATIONALITY
  INSERT INTO public.trivia_player_clue_index (esport, player_id, clue_type, clue_value)
  SELECT DISTINCT p.videogame_name, p.id, 'nationality', p.nationality
  FROM public.pandascore_players_master p
  WHERE p.active AND p.nationality IS NOT NULL
    AND (_esport IS NULL OR p.videogame_name = _esport)
  ON CONFLICT DO NOTHING;

  -- ROLE
  INSERT INTO public.trivia_player_clue_index (esport, player_id, clue_type, clue_value)
  SELECT DISTINCT p.videogame_name, p.id, 'role', p.role
  FROM public.pandascore_players_master p
  WHERE p.active AND p.role IS NOT NULL
    AND (_esport IS NULL OR p.videogame_name = _esport)
  ON CONFLICT DO NOTHING;

  -- restrict to players that actually appear in Tier S/A history
  -- (so attribute-only clues don't pollute counts with inactive nobodies)
  DELETE FROM public.trivia_player_clue_index pci
  WHERE NOT EXISTS (
    SELECT 1 FROM public.trivia_top_tier_player_history h
    WHERE h.player_id = pci.player_id::text
  );

  IF _esport IS NULL THEN
    SELECT COUNT(*) INTO _n FROM public.trivia_player_clue_index;
  ELSE
    SELECT COUNT(*) INTO _n FROM public.trivia_player_clue_index WHERE esport = _esport;
  END IF;

  RETURN _n;
END$$;

GRANT EXECUTE ON FUNCTION public.trivia_refresh_player_clue_index(text) TO authenticated, service_role;

-- ============================================================
-- Replace counters with index-backed versions
-- ============================================================
CREATE OR REPLACE FUNCTION public.trivia_count_clue_answers(
  _esport text, _clue_type text, _clue_value text
) RETURNS integer
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$
  SELECT COUNT(*)::int FROM public.trivia_player_clue_index
  WHERE esport = _esport AND clue_type = _clue_type AND clue_value = _clue_value;
$$;

CREATE OR REPLACE FUNCTION public.trivia_count_intersection(
  _esport text,
  _row_type text, _row_value text,
  _col_type text, _col_value text
) RETURNS integer
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$
  SELECT COUNT(*)::int FROM (
    SELECT player_id FROM public.trivia_player_clue_index
      WHERE esport = _esport AND clue_type = _row_type AND clue_value = _row_value
    INTERSECT
    SELECT player_id FROM public.trivia_player_clue_index
      WHERE esport = _esport AND clue_type = _col_type AND clue_value = _col_value
  ) x;
$$;

GRANT EXECUTE ON FUNCTION public.trivia_count_clue_answers(text,text,text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.trivia_count_intersection(text,text,text,text,text) TO anon, authenticated, service_role;