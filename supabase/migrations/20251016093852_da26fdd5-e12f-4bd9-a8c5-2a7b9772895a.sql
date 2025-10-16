-- Create function to calculate basic player stats from match data
CREATE OR REPLACE FUNCTION public.get_faceit_player_basic_stats(p_player_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_total_matches INT := 0;
  v_wins INT := 0;
  v_losses INT := 0;
  v_current_streak INT := 0;
  v_longest_streak INT := 0;
  v_recent_form TEXT := '';
  v_last_10_matches jsonb := '[]';
  v_profile RECORD;
  thirty_days_ago TIMESTAMPTZ := now() - interval '30 days';
  v_recent_matches_30d INT := 0;
  v_recent_wins_30d INT := 0;
BEGIN
  -- Get player profile info from most recent match roster
  SELECT 
    r->>'nickname' as nickname,
    r->>'avatar' as avatar,
    r->>'membership' as membership,
    (r->>'game_skill_level')::int as skill_level
  INTO v_profile
  FROM faceit_matches fm,
       jsonb_array_elements(
         COALESCE(fm.teams->'faction1'->'roster', '[]'::jsonb) ||
         COALESCE(fm.teams->'faction2'->'roster', '[]'::jsonb)
       ) r
  WHERE r->>'player_id' = p_player_id
    AND fm.status = 'finished'
  ORDER BY fm.started_at DESC NULLS LAST
  LIMIT 1;

  IF v_profile.nickname IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- Calculate stats from finished matches
  WITH player_matches AS (
    SELECT 
      fm.match_id,
      fm.started_at,
      fm.teams->'faction1'->>'name' as faction1_name,
      fm.teams->'faction2'->>'name' as faction2_name,
      LOWER(COALESCE(fm.faceit_data->'results'->>'winner', fm.raw_data->'results'->>'winner', '')) as winner,
      fm.competition_name,
      fm.competition_type,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM jsonb_array_elements(fm.teams->'faction1'->'roster') r 
          WHERE r->>'player_id' = p_player_id
        ) THEN 'faction1'
        ELSE 'faction2'
      END as player_team
    FROM faceit_matches fm
    WHERE fm.status = 'finished'
      AND (
        EXISTS (
          SELECT 1 FROM jsonb_array_elements(fm.teams->'faction1'->'roster') r 
          WHERE r->>'player_id' = p_player_id
        ) OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(fm.teams->'faction2'->'roster') r 
          WHERE r->>'player_id' = p_player_id
        )
      )
    ORDER BY fm.started_at DESC NULLS LAST
  ),
  match_results AS (
    SELECT 
      *,
      CASE WHEN winner = player_team THEN true ELSE false END as won_match
    FROM player_matches
  )
  SELECT 
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE won_match)::int,
    COUNT(*) FILTER (WHERE started_at >= thirty_days_ago)::int,
    COUNT(*) FILTER (WHERE won_match AND started_at >= thirty_days_ago)::int
  INTO v_total_matches, v_wins, v_recent_matches_30d, v_recent_wins_30d
  FROM match_results;

  v_losses := v_total_matches - v_wins;

  -- Calculate recent form and last 10 matches
  WITH last_10 AS (
    SELECT 
      mr.match_id,
      mr.started_at,
      mr.faction1_name,
      mr.faction2_name,
      mr.player_team,
      mr.won_match,
      mr.competition_name,
      mr.competition_type
    FROM (
      SELECT 
        fm.match_id,
        fm.started_at,
        fm.teams->'faction1'->>'name' as faction1_name,
        fm.teams->'faction2'->>'name' as faction2_name,
        LOWER(COALESCE(fm.faceit_data->'results'->>'winner', fm.raw_data->'results'->>'winner', '')) as winner,
        fm.competition_name,
        fm.competition_type,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM jsonb_array_elements(fm.teams->'faction1'->'roster') r 
            WHERE r->>'player_id' = p_player_id
          ) THEN 'faction1'
          ELSE 'faction2'
        END as player_team,
        CASE 
          WHEN LOWER(COALESCE(fm.faceit_data->'results'->>'winner', fm.raw_data->'results'->>'winner', '')) = 
               CASE 
                 WHEN EXISTS (
                   SELECT 1 FROM jsonb_array_elements(fm.teams->'faction1'->'roster') r 
                   WHERE r->>'player_id' = p_player_id
                 ) THEN 'faction1'
                 ELSE 'faction2'
               END 
          THEN true 
          ELSE false 
        END as won_match
      FROM faceit_matches fm
      WHERE fm.status = 'finished'
        AND (
          EXISTS (
            SELECT 1 FROM jsonb_array_elements(fm.teams->'faction1'->'roster') r 
            WHERE r->>'player_id' = p_player_id
          ) OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(fm.teams->'faction2'->'roster') r 
            WHERE r->>'player_id' = p_player_id
          )
        )
      ORDER BY fm.started_at DESC NULLS LAST
      LIMIT 10
    ) mr
  )
  SELECT 
    STRING_AGG(CASE WHEN won_match THEN 'W' ELSE 'L' END, '' ORDER BY started_at DESC),
    jsonb_agg(
      jsonb_build_object(
        'matchId', match_id,
        'date', started_at,
        'opponent', CASE WHEN player_team = 'faction1' THEN faction2_name ELSE faction1_name END,
        'result', CASE WHEN won_match THEN 'W' ELSE 'L' END,
        'tournament', competition_name,
        'competitionType', competition_type
      )
      ORDER BY started_at DESC
    )
  INTO v_recent_form, v_last_10_matches
  FROM last_10;

  -- Calculate current win streak
  WITH ordered_results AS (
    SELECT 
      CASE 
        WHEN LOWER(COALESCE(fm.faceit_data->'results'->>'winner', fm.raw_data->'results'->>'winner', '')) = 
             CASE 
               WHEN EXISTS (
                 SELECT 1 FROM jsonb_array_elements(fm.teams->'faction1'->'roster') r 
                 WHERE r->>'player_id' = p_player_id
               ) THEN 'faction1'
               ELSE 'faction2'
             END 
        THEN true 
        ELSE false 
      END as won_match,
      ROW_NUMBER() OVER (ORDER BY fm.started_at DESC) as rn
    FROM faceit_matches fm
    WHERE fm.status = 'finished'
      AND (
        EXISTS (
          SELECT 1 FROM jsonb_array_elements(fm.teams->'faction1'->'roster') r 
          WHERE r->>'player_id' = p_player_id
        ) OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(fm.teams->'faction2'->'roster') r 
          WHERE r->>'player_id' = p_player_id
        )
      )
  ),
  first_different AS (
    SELECT MIN(rn) as first_diff_rn
    FROM ordered_results
    WHERE rn > 1 
      AND won_match != (SELECT won_match FROM ordered_results WHERE rn = 1)
  )
  SELECT COALESCE(
    (SELECT COUNT(*)::int 
     FROM ordered_results 
     WHERE rn < COALESCE((SELECT first_diff_rn FROM first_different), 999)
       AND won_match = (SELECT won_match FROM ordered_results WHERE rn = 1)),
    0
  )
  INTO v_current_streak;

  RETURN jsonb_build_object(
    'found', true,
    'data_source', 'calculated',
    'profile', jsonb_build_object(
      'player_id', p_player_id,
      'nickname', v_profile.nickname,
      'avatar', v_profile.avatar,
      'membership', v_profile.membership,
      'skill_level', v_profile.skill_level,
      'country', null,
      'faceit_elo', null
    ),
    'career_stats', jsonb_build_object(
      'total_matches', v_total_matches,
      'total_wins', v_wins,
      'total_losses', v_losses,
      'win_rate', CASE WHEN v_total_matches > 0 THEN ROUND((v_wins::decimal / v_total_matches) * 100) ELSE 0 END,
      'avg_kd_ratio', null,
      'avg_headshots_percent', null,
      'current_win_streak', v_current_streak,
      'longest_win_streak', null
    ),
    'recent_stats', jsonb_build_object(
      'matches_30d', v_recent_matches_30d,
      'wins_30d', v_recent_wins_30d,
      'losses_30d', v_recent_matches_30d - v_recent_wins_30d,
      'win_rate_30d', CASE WHEN v_recent_matches_30d > 0 THEN ROUND((v_recent_wins_30d::decimal / v_recent_matches_30d) * 100) ELSE 0 END,
      'recent_form', COALESCE(v_recent_form, ''),
      'form_quality', CASE 
        WHEN v_recent_form LIKE '%WWWWW%' THEN 'excellent'
        WHEN v_recent_form LIKE '%WWW%' THEN 'good'
        WHEN v_recent_form LIKE '%LLL%' THEN 'poor'
        ELSE 'average'
      END
    ),
    'map_stats', '{}'::jsonb,
    'recent_matches', COALESCE(v_last_10_matches, '[]'::jsonb)
  );
END;
$function$;

-- Update existing get_faceit_player_details to use fallback
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
  -- Try to get player profile from faceit_player_stats (synced data)
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

  IF player_profile.player_id IS NOT NULL THEN
    -- Player has synced data - return full detailed stats
    SELECT 
      COUNT(*)::int,
      COUNT(*) FILTER (WHERE fpmh.match_result = 'win')::int
    INTO recent_matches, recent_wins
    FROM public.faceit_player_match_history fpmh
    WHERE fpmh.player_id = p_player_id 
      AND fpmh.match_date >= thirty_days_ago;

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
      'data_source', 'synced',
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
  ELSE
    -- No synced data - fallback to calculated basic stats
    RETURN public.get_faceit_player_basic_stats(p_player_id);
  END IF;
END;
$function$;