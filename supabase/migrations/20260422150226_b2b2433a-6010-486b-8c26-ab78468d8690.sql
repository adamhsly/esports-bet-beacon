
CREATE OR REPLACE FUNCTION public.trivia_clue_matches_player(_player_id bigint, _clue_type text, _clue_value text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _ok boolean := false;
BEGIN
  IF _clue_type = 'team' THEN
    -- Match if player has ever played for this team in a Tier S/A match,
    -- OR currently plays for them (covers freshly transferred players).
    SELECT EXISTS (
      SELECT 1 FROM public.trivia_top_tier_player_history h
      WHERE h.player_id = _player_id::text
        AND h.team_ids ? _clue_value
    ) OR EXISTS (
      SELECT 1 FROM public.pandascore_players_master
      WHERE id = _player_id AND current_team_id::text = _clue_value
    ) INTO _ok;

  ELSIF _clue_type = 'nationality' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.pandascore_players_master
      WHERE id = _player_id AND nationality = _clue_value
    ) INTO _ok;

  ELSIF _clue_type = 'role' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.pandascore_players_master
      WHERE id = _player_id AND role = _clue_value
    ) INTO _ok;

  ELSIF _clue_type = 'tournament' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.trivia_top_tier_player_history h
      WHERE h.player_id = _player_id::text
        AND h.tournament_id = _clue_value
    ) INTO _ok;

  ELSIF _clue_type = 'league' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.trivia_top_tier_player_history h
      WHERE h.player_id = _player_id::text
        AND h.league_id = _clue_value
    ) INTO _ok;

  ELSIF _clue_type = 'attribute' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.pandascore_players_master p
      WHERE p.id = _player_id
        AND (
          p.role = _clue_value
          OR p.nationality = _clue_value
          OR p.videogame_name = _clue_value
        )
    ) INTO _ok;
  END IF;

  RETURN COALESCE(_ok, false);
END;
$function$;
