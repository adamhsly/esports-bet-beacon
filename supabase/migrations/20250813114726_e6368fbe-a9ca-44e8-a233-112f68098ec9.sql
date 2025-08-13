-- Update the database functions to extend date range from ±7 days to ±20 days

-- Update FACEIT match counts function
CREATE OR REPLACE FUNCTION public.faceit_get_match_counts_around_date(target_date timestamp with time zone)
 RETURNS TABLE(match_date date, source text, match_count integer)
 LANGUAGE sql
AS $function$
  select
    date(started_at) as match_date,
    'faceit' as source,
    count(*) as match_count
  from public.faceit_matches
  where started_at between (target_date - interval '20 days') and (target_date + interval '20 days')
  group by date(started_at);
$function$;

-- Update PandaScore match counts function  
CREATE OR REPLACE FUNCTION public.pandascore_get_match_counts_around_date(target_date timestamp with time zone)
 RETURNS TABLE(match_date date, source text, match_count integer)
 LANGUAGE sql
AS $function$
  select
    date(start_time) as match_date,
    'pandascore' as source,
    count(*) as match_count
  from public.pandascore_matches
  where start_time between (target_date - interval '20 days') and (target_date + interval '20 days')
  group by date(start_time);
$function$;

-- Update FACEIT matches fetching function
CREATE OR REPLACE FUNCTION public.get_faceit_matches_around_date(target_date timestamp with time zone)
 RETURNS TABLE(match_date date, id uuid, match_id text, game text, region text, competition_name text, competition_type text, organized_by text, status text, started_at timestamp with time zone, finished_at timestamp with time zone, configured_at timestamp with time zone, calculate_elo boolean, version integer, teams jsonb, voting jsonb, faceit_data jsonb, raw_data jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, scheduled_at timestamp with time zone, championship_stream_url text, championship_raw_data jsonb, match_phase text, current_round integer, round_timer_seconds integer, overtime_rounds integer, live_team_scores jsonb, maps_played jsonb, round_results jsonb, live_player_status jsonb, kill_feed jsonb, economy_data jsonb, objectives_status jsonb, auto_refresh_interval integer, last_live_update timestamp with time zone)
 LANGUAGE sql
AS $function$
  select
    date(started_at) as match_date,
    id,
    match_id,
    game,
    region,
    competition_name,
    competition_type,
    organized_by,
    status,
    started_at,
    finished_at,
    configured_at,
    calculate_elo,
    version,
    teams,
    voting,
    faceit_data,
    raw_data,
    created_at,
    updated_at,
    scheduled_at,
    championship_stream_url,
    championship_raw_data,
    match_phase,
    current_round,
    round_timer_seconds,
    overtime_rounds,
    live_team_scores,
    maps_played,
    round_results,
    live_player_status,
    kill_feed,
    economy_data,
    objectives_status,
    auto_refresh_interval,
    last_live_update
  from public.faceit_matches
  where started_at between (target_date - interval '20 days') and (target_date + interval '20 days');
$function$;

-- Update PandaScore matches fetching function
CREATE OR REPLACE FUNCTION public.get_pandascore_matches_around_date(target_date timestamp with time zone)
 RETURNS TABLE(match_date date, id uuid, match_id text, esport_type text, teams jsonb, start_time timestamp with time zone, end_time timestamp with time zone, tournament_id text, tournament_name text, league_id text, league_name text, serie_id text, serie_name text, status text, match_type text, number_of_games integer, raw_data jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, last_synced_at timestamp with time zone, slug text, draw boolean, forfeit boolean, original_scheduled_at timestamp with time zone, rescheduled boolean, detailed_stats boolean, winner_id text, winner_type text, videogame_id text, videogame_name text, stream_url_1 text, stream_url_2 text, modified_at timestamp with time zone, team_a_player_ids jsonb, team_b_player_ids jsonb, row_id bigint)
 LANGUAGE sql
AS $function$
  select
    date(start_time) as match_date,
    *
  from public.pandascore_matches
  where start_time between (target_date - interval '20 days') and (target_date + interval '20 days');
$function$;