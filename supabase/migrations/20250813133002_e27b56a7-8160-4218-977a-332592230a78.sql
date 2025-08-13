-- Fix the PandaScore matches fetching function to properly return all columns
CREATE OR REPLACE FUNCTION public.get_pandascore_matches_around_date(target_date timestamp with time zone)
 RETURNS TABLE(match_date date, id uuid, match_id text, esport_type text, teams jsonb, start_time timestamp with time zone, end_time timestamp with time zone, tournament_id text, tournament_name text, league_id text, league_name text, serie_id text, serie_name text, status text, match_type text, number_of_games integer, raw_data jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, last_synced_at timestamp with time zone, slug text, draw boolean, forfeit boolean, original_scheduled_at timestamp with time zone, rescheduled boolean, detailed_stats boolean, winner_id text, winner_type text, videogame_id text, videogame_name text, stream_url_1 text, stream_url_2 text, modified_at timestamp with time zone, team_a_player_ids jsonb, team_b_player_ids jsonb, row_id bigint)
 LANGUAGE sql
AS $function$
  select
    date(start_time) as match_date,
    id,
    match_id,
    esport_type,
    teams,
    start_time,
    end_time,
    tournament_id,
    tournament_name,
    league_id,
    league_name,
    serie_id,
    serie_name,
    status,
    match_type,
    number_of_games,
    raw_data,
    created_at,
    updated_at,
    last_synced_at,
    slug,
    draw,
    forfeit,
    original_scheduled_at,
    rescheduled,
    detailed_stats,
    winner_id,
    winner_type,
    videogame_id,
    videogame_name,
    stream_url_1,
    stream_url_2,
    modified_at,
    team_a_player_ids,
    team_b_player_ids,
    row_id
  from public.pandascore_matches
  where start_time between (target_date - interval '20 days') and (target_date + interval '20 days');
$function$;