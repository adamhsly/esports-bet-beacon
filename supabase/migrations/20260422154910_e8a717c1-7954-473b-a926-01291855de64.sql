-- Fast set-based counter for a single clue
CREATE OR REPLACE FUNCTION public.trivia_count_clue_answers(
  _esport text, _clue_type text, _clue_value text
) RETURNS integer
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS
$$
DECLARE _n integer;
BEGIN
  IF _clue_type = 'team' THEN
    SELECT COUNT(DISTINCT p.id) INTO _n
    FROM public.pandascore_players_master p
    WHERE p.active AND p.videogame_name = _esport
      AND (
        p.current_team_id::text = _clue_value
        OR EXISTS (
          SELECT 1 FROM public.trivia_top_tier_player_history h
          WHERE h.player_id = p.id::text AND h.team_id = _clue_value
        )
      );

  ELSIF _clue_type = 'faced' THEN
    SELECT COUNT(DISTINCT p.id) INTO _n
    FROM public.pandascore_players_master p
    JOIN public.trivia_top_tier_player_history h ON h.player_id = p.id::text
    WHERE p.active AND p.videogame_name = _esport
      AND h.opponent_team_id = _clue_value;

  ELSIF _clue_type = 'teammate' THEN
    SELECT COUNT(DISTINCT p.id) INTO _n
    FROM public.pandascore_players_master p
    JOIN public.trivia_top_tier_player_history h ON h.player_id = p.id::text
    WHERE p.active AND p.videogame_name = _esport
      AND h.teammate_ids ? _clue_value
      AND p.id::text <> _clue_value;

  ELSIF _clue_type = 'year' THEN
    SELECT COUNT(DISTINCT p.id) INTO _n
    FROM public.pandascore_players_master p
    JOIN public.trivia_top_tier_player_history h ON h.player_id = p.id::text
    WHERE p.active AND p.videogame_name = _esport
      AND h.year::text = _clue_value;

  ELSIF _clue_type = 'tournament' THEN
    SELECT COUNT(DISTINCT p.id) INTO _n
    FROM public.pandascore_players_master p
    JOIN public.trivia_top_tier_player_history h ON h.player_id = p.id::text
    WHERE p.active AND p.videogame_name = _esport
      AND (h.serie_id = _clue_value OR h.tournament_id = _clue_value);

  ELSIF _clue_type = 'league' THEN
    SELECT COUNT(DISTINCT p.id) INTO _n
    FROM public.pandascore_players_master p
    JOIN public.trivia_top_tier_player_history h ON h.player_id = p.id::text
    WHERE p.active AND p.videogame_name = _esport
      AND (h.league_id = _clue_value OR h.league_name = _clue_value);

  ELSIF _clue_type = 'nationality' THEN
    SELECT COUNT(*) INTO _n
    FROM public.pandascore_players_master p
    WHERE p.active AND p.videogame_name = _esport AND p.nationality = _clue_value;

  ELSIF _clue_type = 'role' THEN
    SELECT COUNT(*) INTO _n
    FROM public.pandascore_players_master p
    WHERE p.active AND p.videogame_name = _esport AND p.role = _clue_value;

  ELSE _n := 0;
  END IF;

  RETURN COALESCE(_n,0);
END$$;

-- Resolve a clue to its candidate player set (helper for fast intersection)
CREATE OR REPLACE FUNCTION public.trivia_clue_player_ids(
  _esport text, _clue_type text, _clue_value text
) RETURNS TABLE(player_id bigint)
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS
$$
BEGIN
  IF _clue_type = 'team' THEN
    RETURN QUERY
      SELECT DISTINCT p.id FROM public.pandascore_players_master p
      WHERE p.active AND p.videogame_name = _esport
        AND (
          p.current_team_id::text = _clue_value
          OR EXISTS (
            SELECT 1 FROM public.trivia_top_tier_player_history h
            WHERE h.player_id = p.id::text AND h.team_id = _clue_value
          )
        );
  ELSIF _clue_type = 'faced' THEN
    RETURN QUERY
      SELECT DISTINCT p.id FROM public.pandascore_players_master p
      JOIN public.trivia_top_tier_player_history h ON h.player_id = p.id::text
      WHERE p.active AND p.videogame_name = _esport AND h.opponent_team_id = _clue_value;
  ELSIF _clue_type = 'teammate' THEN
    RETURN QUERY
      SELECT DISTINCT p.id FROM public.pandascore_players_master p
      JOIN public.trivia_top_tier_player_history h ON h.player_id = p.id::text
      WHERE p.active AND p.videogame_name = _esport
        AND h.teammate_ids ? _clue_value AND p.id::text <> _clue_value;
  ELSIF _clue_type = 'year' THEN
    RETURN QUERY
      SELECT DISTINCT p.id FROM public.pandascore_players_master p
      JOIN public.trivia_top_tier_player_history h ON h.player_id = p.id::text
      WHERE p.active AND p.videogame_name = _esport AND h.year::text = _clue_value;
  ELSIF _clue_type = 'tournament' THEN
    RETURN QUERY
      SELECT DISTINCT p.id FROM public.pandascore_players_master p
      JOIN public.trivia_top_tier_player_history h ON h.player_id = p.id::text
      WHERE p.active AND p.videogame_name = _esport
        AND (h.serie_id = _clue_value OR h.tournament_id = _clue_value);
  ELSIF _clue_type = 'league' THEN
    RETURN QUERY
      SELECT DISTINCT p.id FROM public.pandascore_players_master p
      JOIN public.trivia_top_tier_player_history h ON h.player_id = p.id::text
      WHERE p.active AND p.videogame_name = _esport
        AND (h.league_id = _clue_value OR h.league_name = _clue_value);
  ELSIF _clue_type = 'nationality' THEN
    RETURN QUERY
      SELECT p.id FROM public.pandascore_players_master p
      WHERE p.active AND p.videogame_name = _esport AND p.nationality = _clue_value;
  ELSIF _clue_type = 'role' THEN
    RETURN QUERY
      SELECT p.id FROM public.pandascore_players_master p
      WHERE p.active AND p.videogame_name = _esport AND p.role = _clue_value;
  END IF;
END$$;

-- Fast set-based intersection counter
CREATE OR REPLACE FUNCTION public.trivia_count_intersection(
  _esport text,
  _row_type text, _row_value text,
  _col_type text, _col_value text
) RETURNS integer
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$
  SELECT COUNT(*)::int FROM (
    SELECT player_id FROM public.trivia_clue_player_ids(_esport, _row_type, _row_value)
    INTERSECT
    SELECT player_id FROM public.trivia_clue_player_ids(_esport, _col_type, _col_value)
  ) x;
$$;

GRANT EXECUTE ON FUNCTION public.trivia_count_clue_answers(text,text,text)        TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.trivia_count_intersection(text,text,text,text,text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.trivia_clue_player_ids(text,text,text)           TO anon, authenticated, service_role;