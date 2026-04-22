
-- 1) Top-tier teams per esport (Tier S/A) with appearance counts
CREATE OR REPLACE VIEW public.trivia_top_tier_teams AS
SELECT
  m.videogame_name AS esport,
  opp.team_id::text AS team_id,
  opp.team_name,
  COUNT(*) AS appearances,
  MAX(t.raw_data->>'tier') AS best_tier
FROM public.pandascore_matches m
JOIN public.pandascore_tournaments t
  ON t.tournament_id = m.tournament_id
CROSS JOIN LATERAL (
  SELECT
    (m.teams->'opponent1'->'opponent'->>'id') AS team_id,
    (m.teams->'opponent1'->'opponent'->>'name') AS team_name
  UNION ALL
  SELECT
    (m.teams->'opponent2'->'opponent'->>'id') AS team_id,
    (m.teams->'opponent2'->'opponent'->>'name') AS team_name
) opp
WHERE t.raw_data->>'tier' IN ('s','a')
  AND opp.team_id IS NOT NULL
  AND opp.team_name IS NOT NULL
GROUP BY m.videogame_name, opp.team_id, opp.team_name;

-- 2) Top-tier tournaments / leagues per esport
CREATE OR REPLACE VIEW public.trivia_top_tier_tournaments AS
SELECT
  t.esport_type AS esport,
  t.tournament_id,
  t.name AS tournament_name,
  t.league_id,
  t.league_name,
  t.raw_data->>'tier' AS tier
FROM public.pandascore_tournaments t
WHERE t.raw_data->>'tier' IN ('s','a');

-- 3) Players appearing in Tier S/A matches
CREATE OR REPLACE VIEW public.trivia_top_tier_player_history AS
SELECT DISTINCT
  m.videogame_name AS esport,
  pid.value::text AS player_id,
  m.tournament_id,
  m.league_id,
  (m.teams->'opponent1'->'opponent'->>'id') AS team_a_id,
  (m.teams->'opponent2'->'opponent'->>'id') AS team_b_id,
  t.raw_data->>'tier' AS tier
FROM public.pandascore_matches m
JOIN public.pandascore_tournaments t
  ON t.tournament_id = m.tournament_id
CROSS JOIN LATERAL jsonb_array_elements_text(
  COALESCE(m.team_a_player_ids, '[]'::jsonb) || COALESCE(m.team_b_player_ids, '[]'::jsonb)
) AS pid(value)
WHERE t.raw_data->>'tier' IN ('s','a');

-- 4) RPC: snapshot of top-tier teams for an esport
CREATE OR REPLACE FUNCTION public.trivia_get_top_tier_teams(_esport text, _min_appearances int DEFAULT 3)
RETURNS TABLE(team_id text, team_name text, appearances bigint, best_tier text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT team_id, team_name, appearances, best_tier
  FROM public.trivia_top_tier_teams
  WHERE esport = _esport
    AND appearances >= _min_appearances
  ORDER BY (best_tier = 's') DESC, appearances DESC;
$$;

-- 5) RPC: snapshot of top-tier tournaments for an esport
CREATE OR REPLACE FUNCTION public.trivia_get_top_tier_tournaments(_esport text)
RETURNS TABLE(tournament_id text, tournament_name text, league_id text, league_name text, tier text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tournament_id, tournament_name, league_id, league_name, tier
  FROM public.trivia_top_tier_tournaments
  WHERE esport = _esport;
$$;

-- 6) RPC: per-player top-tier history rows
CREATE OR REPLACE FUNCTION public.trivia_player_top_tier_match(
  _esport text,
  _player_ids text[]
)
RETURNS TABLE(player_id text, team_id text, tournament_id text, league_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT h.player_id,
         t.team_id,
         h.tournament_id,
         h.league_id
  FROM public.trivia_top_tier_player_history h
  JOIN LATERAL (
    SELECT unnest(ARRAY[h.team_a_id, h.team_b_id]) AS team_id
  ) t ON TRUE
  WHERE h.esport = _esport
    AND h.player_id = ANY(_player_ids);
$$;

-- 7) Recognition metadata on board fingerprints
ALTER TABLE public.trivia_board_fingerprints
  ADD COLUMN IF NOT EXISTS recognition_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_clue_tier text;

-- 8) Recognition metadata on clue usage cache
ALTER TABLE public.trivia_clue_usage
  ADD COLUMN IF NOT EXISTS popularity_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recognition_tier text;
