-- Create batch-optimized function to get win rates for multiple amateur teams
CREATE OR REPLACE FUNCTION public.get_faceit_teams_stats_batch(
  team_names TEXT[], 
  game_filter TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  thirty_days_ago TIMESTAMPTZ := now() - interval '30 days';
BEGIN
  RETURN (
    WITH team_matches AS (
      SELECT 
        CASE 
          WHEN fm.faction1_name = ANY(team_names) THEN fm.faction1_name
          WHEN fm.faction2_name = ANY(team_names) THEN fm.faction2_name
          ELSE NULL
        END as team_name,
        CASE 
          WHEN fm.faction1_name = ANY(team_names) AND 
               LOWER(COALESCE(fm.faceit_data->'results'->>'winner', fm.raw_data->'results'->>'winner', '')) = 'faction1' 
          THEN 1
          WHEN fm.faction2_name = ANY(team_names) AND 
               LOWER(COALESCE(fm.faceit_data->'results'->>'winner', fm.raw_data->'results'->>'winner', '')) = 'faction2' 
          THEN 1
          ELSE 0
        END as is_win,
        fm.started_at
      FROM faceit_matches fm
      WHERE fm.is_finished = true
        AND (fm.faction1_name = ANY(team_names) OR fm.faction2_name = ANY(team_names))
        AND (fm.game = game_filter OR game_filter IS NULL)
    ),
    team_stats AS (
      SELECT 
        team_name,
        COUNT(*)::int as total_matches,
        SUM(is_win)::int as total_wins,
        COUNT(*) FILTER (WHERE started_at >= thirty_days_ago)::int as recent_matches_30d,
        SUM(is_win) FILTER (WHERE started_at >= thirty_days_ago)::int as recent_wins_30d
      FROM team_matches
      WHERE team_name IS NOT NULL
      GROUP BY team_name
    )
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'team_name', team_name,
          'total_matches', total_matches,
          'wins', total_wins,
          'losses', total_matches - total_wins,
          'win_rate', CASE 
            WHEN total_matches > 0 THEN ROUND((total_wins::numeric / total_matches) * 100)
            ELSE 50
          END,
          'recent_matches_30d', recent_matches_30d,
          'recent_wins_30d', recent_wins_30d,
          'recent_win_rate_30d', CASE 
            WHEN recent_matches_30d > 0 THEN ROUND((recent_wins_30d::numeric / recent_matches_30d) * 100)
            WHEN total_matches > 0 THEN ROUND((total_wins::numeric / total_matches) * 100)
            ELSE 50
          END
        )
      ),
      '[]'::jsonb
    )
    FROM team_stats
  );
END;
$$;