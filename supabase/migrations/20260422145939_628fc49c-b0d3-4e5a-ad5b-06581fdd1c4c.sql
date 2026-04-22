
DROP VIEW IF EXISTS public.trivia_top_tier_teams CASCADE;
DROP VIEW IF EXISTS public.trivia_top_tier_player_history CASCADE;

CREATE VIEW public.trivia_top_tier_teams AS
SELECT
  m.videogame_name AS esport,
  (elem->'opponent'->>'id')::text AS team_id,
  (elem->'opponent'->>'name') AS team_name,
  COUNT(*) AS appearances,
  MAX(t.raw_data->>'tier') AS best_tier
FROM public.pandascore_matches m
JOIN public.pandascore_tournaments t
  ON t.tournament_id = m.tournament_id
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(m.teams, '[]'::jsonb)) AS elem
WHERE t.raw_data->>'tier' IN ('s','a')
  AND elem ? 'opponent'
  AND (elem->'opponent'->>'id') IS NOT NULL
  AND (elem->'opponent'->>'name') IS NOT NULL
GROUP BY m.videogame_name, (elem->'opponent'->>'id'), (elem->'opponent'->>'name');

CREATE VIEW public.trivia_top_tier_player_history AS
SELECT DISTINCT
  m.videogame_name AS esport,
  pid.value::text AS player_id,
  m.tournament_id,
  m.league_id,
  (
    SELECT jsonb_agg(elem->'opponent'->>'id')
    FROM jsonb_array_elements(COALESCE(m.teams, '[]'::jsonb)) elem
    WHERE elem ? 'opponent'
  ) AS team_ids,
  t.raw_data->>'tier' AS tier
FROM public.pandascore_matches m
JOIN public.pandascore_tournaments t
  ON t.tournament_id = m.tournament_id
CROSS JOIN LATERAL jsonb_array_elements_text(
  COALESCE(m.team_a_player_ids, '[]'::jsonb) || COALESCE(m.team_b_player_ids, '[]'::jsonb)
) AS pid(value)
WHERE t.raw_data->>'tier' IN ('s','a');

-- Re-create RPCs that depended on the dropped views
CREATE OR REPLACE FUNCTION public.trivia_get_top_tier_teams(_esport text, _min_appearances int DEFAULT 3)
RETURNS TABLE(team_id text, team_name text, appearances bigint, best_tier text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT team_id, team_name, appearances, best_tier
  FROM public.trivia_top_tier_teams
  WHERE esport = _esport
    AND appearances >= _min_appearances
  ORDER BY (best_tier = 's') DESC, appearances DESC;
$$;

CREATE OR REPLACE FUNCTION public.trivia_player_top_tier_match(
  _esport text,
  _player_ids text[]
)
RETURNS TABLE(player_id text, team_id text, tournament_id text, league_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT h.player_id,
         (tid)::text AS team_id,
         h.tournament_id,
         h.league_id
  FROM public.trivia_top_tier_player_history h
  CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(h.team_ids, '[]'::jsonb)) AS tid
  WHERE h.esport = _esport
    AND h.player_id = ANY(_player_ids);
$$;

-- Case-insensitive esport resolver for tournaments view
CREATE OR REPLACE FUNCTION public.trivia_get_top_tier_tournaments(_esport text)
RETURNS TABLE(tournament_id text, tournament_name text, league_id text, league_name text, tier text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tournament_id, tournament_name, league_id, league_name, tier
  FROM public.trivia_top_tier_tournaments
  WHERE LOWER(REPLACE(esport,' ','')) = LOWER(REPLACE(_esport,' ',''));
$$;
