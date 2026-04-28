DROP FUNCTION IF EXISTS public.trivia_player_top_tier_match(text, text[]);

CREATE OR REPLACE FUNCTION public.trivia_player_top_tier_match(_esport text, _player_ids text[])
RETURNS TABLE(player_id text, team_id text, opponent_team_id text, tournament_id text, league_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT DISTINCT h.player_id, h.team_id, h.opponent_team_id, h.tournament_id, h.league_id
  FROM public.trivia_top_tier_player_history h
  WHERE h.esport = _esport AND h.player_id = ANY(_player_ids);
$$;