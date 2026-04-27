-- Materialize the three Tier S/A "view" objects so the trivia generator stops timing out.

DROP FUNCTION IF EXISTS public.trivia_get_top_tier_teams(text, integer);
DROP FUNCTION IF EXISTS public.trivia_get_top_tier_tournaments(text);
DROP FUNCTION IF EXISTS public.trivia_player_top_tier_match(text, text[]);
DROP VIEW IF EXISTS public.trivia_top_tier_teams CASCADE;
DROP VIEW IF EXISTS public.trivia_top_tier_tournaments CASCADE;
DROP VIEW IF EXISTS public.trivia_top_tier_player_history CASCADE;

-- 1) Top-tier teams
CREATE MATERIALIZED VIEW public.trivia_top_tier_teams AS
SELECT m.esport_type AS esport,
       (elem.value -> 'opponent') ->> 'id'   AS team_id,
       (elem.value -> 'opponent') ->> 'name' AS team_name,
       count(*)::bigint                       AS appearances,
       max((m.raw_data -> 'tournament') ->> 'tier') AS best_tier
FROM public.pandascore_matches m
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(m.teams) = 'array' THEN m.teams ELSE '[]'::jsonb END
) elem(value)
WHERE ((m.raw_data -> 'tournament') ->> 'tier') = ANY (ARRAY['s','a'])
  AND jsonb_typeof(elem.value) = 'object'
  AND elem.value ? 'opponent'
  AND ((elem.value -> 'opponent') ->> 'id')   IS NOT NULL
  AND ((elem.value -> 'opponent') ->> 'name') IS NOT NULL
GROUP BY m.esport_type,
         ((elem.value -> 'opponent') ->> 'id'),
         ((elem.value -> 'opponent') ->> 'name');

CREATE UNIQUE INDEX trivia_top_tier_teams_uniq
  ON public.trivia_top_tier_teams (esport, team_id, team_name);
CREATE INDEX trivia_top_tier_teams_esport_appearances
  ON public.trivia_top_tier_teams (esport, appearances DESC);

-- 2) Top-tier tournaments
CREATE MATERIALIZED VIEW public.trivia_top_tier_tournaments AS
SELECT esport_type   AS esport,
       tournament_id,
       name          AS tournament_name,
       league_id,
       league_name,
       raw_data ->> 'tier' AS tier
FROM public.pandascore_tournaments
WHERE (raw_data ->> 'tier') = ANY (ARRAY['s','a']);

CREATE UNIQUE INDEX trivia_top_tier_tournaments_uniq
  ON public.trivia_top_tier_tournaments (esport, tournament_id);
CREATE INDEX trivia_top_tier_tournaments_esport
  ON public.trivia_top_tier_tournaments (esport);

-- 3) Top-tier player history
CREATE MATERIALIZED VIEW public.trivia_top_tier_player_history AS
WITH base AS (
  SELECT m.match_id,
         m.esport_type AS esport,
         m.start_time,
         EXTRACT(year FROM COALESCE(m.start_time,
           ((m.raw_data -> 'serie') ->> 'begin_at')::timestamptz))::integer AS year,
         m.tournament_id,
         m.league_id,
         NULLIF((m.raw_data -> 'serie') ->> 'id', '')        AS serie_id,
         NULLIF((m.raw_data -> 'serie') ->> 'full_name', '') AS serie_name,
         NULLIF((m.raw_data -> 'league') ->> 'name', '')     AS league_name,
         NULLIF((m.raw_data -> 'tournament') ->> 'tier', '') AS tier,
         CASE WHEN jsonb_typeof(m.teams) = 'array'
              THEN NULLIF(((m.teams -> 0) -> 'opponent') ->> 'id', '')
              ELSE NULL END AS team_a_id,
         CASE WHEN jsonb_typeof(m.teams) = 'array'
              THEN NULLIF(((m.teams -> 1) -> 'opponent') ->> 'id', '')
              ELSE NULL END AS team_b_id,
         CASE WHEN jsonb_typeof(m.team_a_player_ids) = 'array'
              THEN m.team_a_player_ids ELSE '[]'::jsonb END AS team_a_pids,
         CASE WHEN jsonb_typeof(m.team_b_player_ids) = 'array'
              THEN m.team_b_player_ids ELSE '[]'::jsonb END AS team_b_pids
  FROM public.pandascore_matches m
  WHERE ((m.raw_data -> 'tournament') ->> 'tier') = ANY (ARRAY['s','a'])
    AND m.esport_type IS NOT NULL
)
SELECT base.esport, base.match_id, base.start_time, base.year,
       base.tournament_id, base.league_id, base.league_name,
       base.serie_id, base.serie_name, base.tier,
       pid.value AS player_id,
       base.team_a_id AS team_id,
       base.team_b_id AS opponent_team_id,
       base.team_a_pids AS teammate_ids
FROM base, LATERAL jsonb_array_elements_text(base.team_a_pids) pid(value)
WHERE base.team_a_id IS NOT NULL
UNION ALL
SELECT base.esport, base.match_id, base.start_time, base.year,
       base.tournament_id, base.league_id, base.league_name,
       base.serie_id, base.serie_name, base.tier,
       pid.value AS player_id,
       base.team_b_id AS team_id,
       base.team_a_id AS opponent_team_id,
       base.team_b_pids AS teammate_ids
FROM base, LATERAL jsonb_array_elements_text(base.team_b_pids) pid(value)
WHERE base.team_b_id IS NOT NULL;

CREATE INDEX trivia_top_tier_player_history_lookup
  ON public.trivia_top_tier_player_history (esport, player_id);
CREATE INDEX trivia_top_tier_player_history_player_only
  ON public.trivia_top_tier_player_history (player_id);
CREATE INDEX trivia_top_tier_player_history_team
  ON public.trivia_top_tier_player_history (esport, team_id);

-- 4) RPCs against the cached objects
CREATE OR REPLACE FUNCTION public.trivia_get_top_tier_teams(_esport text, _min_appearances integer DEFAULT 3)
RETURNS TABLE(team_id text, team_name text, appearances bigint, best_tier text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT team_id, team_name, appearances, best_tier
  FROM public.trivia_top_tier_teams
  WHERE esport = _esport AND appearances >= _min_appearances
  ORDER BY (best_tier = 's') DESC, appearances DESC;
$$;

CREATE OR REPLACE FUNCTION public.trivia_get_top_tier_tournaments(_esport text)
RETURNS TABLE(tournament_id text, tournament_name text, league_id text, league_name text, tier text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT tournament_id, tournament_name, league_id, league_name, tier
  FROM public.trivia_top_tier_tournaments
  WHERE LOWER(REPLACE(esport,' ','')) = LOWER(REPLACE(_esport,' ',''));
$$;

CREATE OR REPLACE FUNCTION public.trivia_player_top_tier_match(_esport text, _player_ids text[])
RETURNS TABLE(player_id text, team_id text, tournament_id text, league_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT DISTINCT h.player_id, h.team_id, h.tournament_id, h.league_id
  FROM public.trivia_top_tier_player_history h
  WHERE h.esport = _esport AND h.player_id = ANY(_player_ids);
$$;

-- 5) Refresh helper (callable from cron later)
CREATE OR REPLACE FUNCTION public.trivia_refresh_top_tier_caches()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.trivia_top_tier_teams;
  REFRESH MATERIALIZED VIEW public.trivia_top_tier_tournaments;
  REFRESH MATERIALIZED VIEW public.trivia_top_tier_player_history;
END;
$$;

GRANT SELECT ON public.trivia_top_tier_teams           TO anon, authenticated, service_role;
GRANT SELECT ON public.trivia_top_tier_tournaments     TO anon, authenticated, service_role;
GRANT SELECT ON public.trivia_top_tier_player_history  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.trivia_refresh_top_tier_caches() TO service_role;