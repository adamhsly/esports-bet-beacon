-- Create enhanced FACEIT player details function
CREATE OR REPLACE FUNCTION public.get_faceit_player_details(p_player_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE PARALLEL SAFE
AS $function$
DECLARE
  player_profile RECORD;
  total_matches INT := 0;
  recent_matches INT := 0;
  recent_wins INT := 0;
  last_10_matches jsonb := '[]'::jsonb;
  recent_form TEXT := '';
  map_stats jsonb := '{}';
  thirty_days_ago TIMESTAMP := now() - interval '30 days';
BEGIN
  -- Get player profile from faceit_player_stats
  SELECT 
    fps.player_id,
    fps.nickname,
    fps.avatar,
    fps.country,
    fps.membership,
    fps.skill_level,
    fps.faceit_elo,
    fps.total_matches,
    fps.total_wins,
    fps.win_rate,
    fps.avg_kd_ratio,
    fps.avg_headshots_percent,
    fps.current_win_streak,
    fps.longest_win_streak,
    fps.recent_form,
    fps.recent_form_string,
    fps.map_stats
  INTO player_profile
  FROM public.faceit_player_stats fps
  WHERE fps.player_id = p_player_id;

  IF player_profile.player_id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- Get recent match count and wins (last 30 days)
  SELECT 
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE fpmh.match_result = 'win')::int
  INTO recent_matches, recent_wins
  FROM public.faceit_player_match_history fpmh
  WHERE fpmh.player_id = p_player_id 
    AND fpmh.match_date >= thirty_days_ago;

  -- Get last 10 matches with detailed info
  SELECT jsonb_agg(
    jsonb_build_object(
      'matchId', fpmh.match_id,
      'date', fpmh.match_date,
      'map', fpmh.map_name,
      'result', fpmh.match_result,
      'opponent', fpmh.opponent_team_name,
      'competition', fpmh.competition_name,
      'kills', fpmh.kills,
      'deaths', fpmh.deaths,
      'assists', fpmh.assists,
      'kd_ratio', fpmh.kd_ratio,
      'adr', fpmh.adr,
      'mvps', fpmh.mvps,
      'headshots_percent', fpmh.headshots_percent,
      'elo_change', fpmh.faceit_elo_change
    )
    ORDER BY fpmh.match_date DESC
  )
  INTO last_10_matches
  FROM (
    SELECT * FROM public.faceit_player_match_history fpmh
    WHERE fpmh.player_id = p_player_id
    ORDER BY fpmh.match_date DESC
    LIMIT 10
  ) fpmh;

  -- Build recent form string from recent matches if not available
  IF player_profile.recent_form_string IS NULL THEN
    SELECT STRING_AGG(
      CASE WHEN fpmh.match_result = 'win' THEN 'W' ELSE 'L' END,
      '' ORDER BY fpmh.match_date DESC
    )
    INTO recent_form
    FROM (
      SELECT * FROM public.faceit_player_match_history fpmh
      WHERE fpmh.player_id = p_player_id
      ORDER BY fpmh.match_date DESC
      LIMIT 10
    ) fpmh;
  ELSE
    recent_form := player_profile.recent_form_string;
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'profile', jsonb_build_object(
      'player_id', player_profile.player_id,
      'nickname', player_profile.nickname,
      'avatar', player_profile.avatar,
      'country', player_profile.country,
      'membership', player_profile.membership,
      'skill_level', player_profile.skill_level,
      'faceit_elo', player_profile.faceit_elo
    ),
    'career_stats', jsonb_build_object(
      'total_matches', player_profile.total_matches,
      'total_wins', player_profile.total_wins,
      'total_losses', player_profile.total_matches - player_profile.total_wins,
      'win_rate', player_profile.win_rate,
      'avg_kd_ratio', player_profile.avg_kd_ratio,
      'avg_headshots_percent', player_profile.avg_headshots_percent,
      'current_win_streak', player_profile.current_win_streak,
      'longest_win_streak', player_profile.longest_win_streak
    ),
    'recent_stats', jsonb_build_object(
      'matches_30d', recent_matches,
      'wins_30d', recent_wins,
      'losses_30d', recent_matches - recent_wins,
      'win_rate_30d', CASE WHEN recent_matches > 0 THEN ROUND((recent_wins::decimal / recent_matches) * 100) ELSE 0 END,
      'recent_form', COALESCE(recent_form, ''),
      'form_quality', CASE 
        WHEN recent_form LIKE '%WWWWW%' THEN 'excellent'
        WHEN recent_form LIKE '%WWW%' THEN 'good'
        WHEN recent_form LIKE '%LLL%' THEN 'poor'
        ELSE 'average'
      END
    ),
    'map_stats', COALESCE(player_profile.map_stats, '{}'),
    'recent_matches', COALESCE(last_10_matches, '[]')
  );
END;
$function$;