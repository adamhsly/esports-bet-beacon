-- Create fast match counts function using the materialized view
CREATE OR REPLACE FUNCTION public.get_daily_match_counts_fast(start_date date, end_date date)
 RETURNS TABLE(match_date date, source text, count bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT dmc.match_date, dmc.source, dmc.match_count
  FROM daily_match_counts dmc
  WHERE dmc.match_date BETWEEN start_date AND end_date
  ORDER BY dmc.match_date, dmc.source;
END;
$function$;

-- Create function to get heavy match details on-demand
CREATE OR REPLACE FUNCTION public.get_match_details_heavy(p_match_id text, p_source text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF p_source = 'amateur' THEN
    SELECT jsonb_build_object(
      'raw_data', raw_data,
      'faceit_data', faceit_data,
      'voting', voting,
      'teams', teams,
      'live_team_scores', live_team_scores,
      'maps_played', maps_played,
      'round_results', round_results
    ) INTO result
    FROM faceit_matches
    WHERE match_id = p_match_id;
  ELSE
    SELECT jsonb_build_object(
      'raw_data', raw_data,
      'teams', teams,
      'winner_id', winner_id,
      'stream_url_1', stream_url_1,
      'stream_url_2', stream_url_2
    ) INTO result
    FROM pandascore_matches
    WHERE match_id = p_match_id;
  END IF;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$function$;