-- Create RPC to fetch PandaScore player details from players_master + matches
CREATE OR REPLACE FUNCTION public.get_pandascore_player_details(p_player_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  prof RECORD;
  total_matches INT := 0;
  wins INT := 0;
  losses INT := 0;
  last_10 jsonb := '[]'::jsonb;
  recent_form TEXT := '';
  vg_name TEXT;
BEGIN
  -- Basic profile from master
  SELECT 
    id,
    name,
    first_name,
    last_name,
    slug,
    image_url,
    role,
    nationality,
    age,
    birthday,
    active,
    current_team_id,
    current_team_name,
    current_team_acronym,
    current_team_image_url,
    current_team_location,
    current_team_slug,
    current_videogame->>'name' AS videogame_name
  INTO prof
  FROM public.pandascore_players_master
  WHERE id = p_player_id;

  IF prof.id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  vg_name := prof.videogame_name;

  -- Totals and wins/losses based on team results when player listed in team rosters
  SELECT 
    COUNT(*)::int,
    COUNT(*) FILTER (
      WHERE winner_id IS NOT NULL AND (
        -- won with team A
        (team_a_player_ids ?| ARRAY[ p_player_id::text ] AND winner_id = (teams->0->'opponent'->>'id')) OR
        -- won with team B
        (team_b_player_ids ?| ARRAY[ p_player_id::text ] AND winner_id = (teams->1->'opponent'->>'id'))
      )
    )::int
  INTO total_matches, wins
  FROM public.pandascore_matches m
  WHERE (team_a_player_ids ?| ARRAY[ p_player_id::text ] OR team_b_player_ids ?| ARRAY[ p_player_id::text ]);

  losses := GREATEST(total_matches - wins, 0);

  -- Recent form string (last 10 results, chronological)
  SELECT COALESCE(
    right(string_agg(
      CASE 
        WHEN winner_id IS NULL THEN '•' -- draw/unknown
        WHEN (team_a_player_ids ?| ARRAY[ p_player_id::text ] AND winner_id = (teams->0->'opponent'->>'id')) OR 
             (team_b_player_ids ?| ARRAY[ p_player_id::text ] AND winner_id = (teams->1->'opponent'->>'id'))
          THEN 'W' ELSE 'L' END,
      '' ORDER BY start_time), 10),
    ''
  )
  INTO recent_form
  FROM public.pandascore_matches m
  WHERE (team_a_player_ids ?| ARRAY[ p_player_id::text ] OR team_b_player_ids ?| ARRAY[ p_player_id::text ]);

  -- Last 10 matches summary for the player
  WITH player_matches AS (
    SELECT 
      m.match_id,
      m.start_time,
      COALESCE(m.tournament_name, m.league_name) AS tournament,
      -- Determine player's team index and opponent name
      CASE 
        WHEN team_a_player_ids ?| ARRAY[ p_player_id::text ] THEN teams->1->'opponent'->>'name'
        WHEN team_b_player_ids ?| ARRAY[ p_player_id::text ] THEN teams->0->'opponent'->>'name'
        ELSE NULL
      END AS opponent_name,
      CASE 
        WHEN winner_id IS NULL THEN 'D'
        WHEN (team_a_player_ids ?| ARRAY[ p_player_id::text ] AND winner_id = (teams->0->'opponent'->>'id')) OR 
             (team_b_player_ids ?| ARRAY[ p_player_id::text ] AND winner_id = (teams->1->'opponent'->>'id'))
          THEN 'W' ELSE 'L' END AS result
    FROM public.pandascore_matches m
    WHERE (team_a_player_ids ?| ARRAY[ p_player_id::text ] OR team_b_player_ids ?| ARRAY[ p_player_id::text ])
    ORDER BY start_time DESC
    LIMIT 10
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'matchId', match_id,
    'date', start_time,
    'tournament', tournament,
    'opponent', opponent_name,
    'result', result
  ) ORDER BY start_time), '[]'::jsonb)
  INTO last_10
  FROM player_matches;

  RETURN jsonb_build_object(
    'found', true,
    'profile', jsonb_build_object(
      'id', prof.id,
      'name', prof.name,
      'first_name', prof.first_name,
      'last_name', prof.last_name,
      'slug', prof.slug,
      'image_url', prof.image_url,
      'role', prof.role,
      'nationality', prof.nationality,
      'age', prof.age,
      'birthday', prof.birthday,
      'active', prof.active,
      'team', jsonb_build_object(
        'id', prof.current_team_id,
        'name', prof.current_team_name,
        'acronym', prof.current_team_acronym,
        'image_url', prof.current_team_image_url,
        'location', prof.current_team_location,
        'slug', prof.current_team_slug
      ),
      'videogame', vg_name
    ),
    'stats', jsonb_build_object(
      'total_matches', total_matches,
      'wins', wins,
      'losses', losses,
      'win_rate', CASE WHEN total_matches > 0 THEN round((wins::decimal/total_matches)*100) ELSE 0 END,
      'recent_form', recent_form,
      'last_10_matches', last_10
    )
  );
END;
$$;
