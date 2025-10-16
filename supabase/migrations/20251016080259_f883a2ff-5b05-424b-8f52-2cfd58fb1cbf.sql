-- Create optimized FACEIT head-to-head function
CREATE OR REPLACE FUNCTION public.get_faceit_head_to_head(
  p_team1_name text,
  p_team2_name text,
  p_game text DEFAULT 'cs2',
  p_match_id text DEFAULT NULL,
  p_months integer DEFAULT 6
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_team1_wins int := 0;
  v_team2_wins int := 0;
  v_total_matches int := 0;
  v_cutoff_date timestamptz;
  v_match_start timestamptz;
BEGIN
  -- Determine time cutoff
  IF p_match_id IS NOT NULL THEN
    SELECT started_at INTO v_match_start
    FROM faceit_matches
    WHERE match_id = p_match_id;
    
    v_cutoff_date := COALESCE(v_match_start, now()) - (p_months || ' months')::interval;
  ELSE
    v_cutoff_date := now() - (p_months || ' months')::interval;
  END IF;

  -- Count head-to-head matches using JSONB operators
  SELECT
    COUNT(*) FILTER (
      WHERE (
        (LOWER(fm.teams->'faction1'->>'name') = LOWER(p_team1_name) 
         AND LOWER(COALESCE(fm.faceit_data->'results'->>'winner', fm.raw_data->'results'->>'winner', '')) = 'faction1')
        OR
        (LOWER(fm.teams->'faction2'->>'name') = LOWER(p_team1_name)
         AND LOWER(COALESCE(fm.faceit_data->'results'->>'winner', fm.raw_data->'results'->>'winner', '')) = 'faction2')
      )
    ),
    COUNT(*) FILTER (
      WHERE (
        (LOWER(fm.teams->'faction1'->>'name') = LOWER(p_team2_name)
         AND LOWER(COALESCE(fm.faceit_data->'results'->>'winner', fm.raw_data->'results'->>'winner', '')) = 'faction1')
        OR
        (LOWER(fm.teams->'faction2'->>'name') = LOWER(p_team2_name)
         AND LOWER(COALESCE(fm.faceit_data->'results'->>'winner', fm.raw_data->'results'->>'winner', '')) = 'faction2')
      )
    ),
    COUNT(*)
  INTO v_team1_wins, v_team2_wins, v_total_matches
  FROM faceit_matches fm
  WHERE fm.is_finished = true
    AND fm.started_at >= v_cutoff_date
    AND (p_match_id IS NULL OR (v_match_start IS NOT NULL AND fm.started_at < v_match_start))
    AND (p_game IS NULL OR fm.game = p_game)
    AND (
      (LOWER(fm.teams->'faction1'->>'name') = LOWER(p_team1_name)
       AND LOWER(fm.teams->'faction2'->>'name') = LOWER(p_team2_name))
      OR
      (LOWER(fm.teams->'faction1'->>'name') = LOWER(p_team2_name)
       AND LOWER(fm.teams->'faction2'->>'name') = LOWER(p_team1_name))
    );

  RETURN jsonb_build_object(
    'team1_wins', v_team1_wins,
    'team2_wins', v_team2_wins,
    'total_matches', v_total_matches,
    'team1_name', p_team1_name,
    'team2_name', p_team2_name,
    'since', v_cutoff_date,
    'until', COALESCE(v_match_start, now())
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_faceit_head_to_head(text, text, text, text, integer) TO anon, authenticated, service_role;