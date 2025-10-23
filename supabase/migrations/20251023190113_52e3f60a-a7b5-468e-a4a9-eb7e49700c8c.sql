-- Create RPC function to get public user picks for leaderboard viewing
CREATE OR REPLACE FUNCTION get_public_user_picks(
  p_user_id uuid,
  p_round_id uuid
)
RETURNS TABLE (
  team_picks jsonb,
  star_team_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    frp.team_picks,
    COALESCE(frst.star_team_id, ''::text) as star_team_id
  FROM fantasy_round_picks frp
  LEFT JOIN fantasy_round_star_teams frst 
    ON frst.user_id = frp.user_id 
    AND frst.round_id = frp.round_id
  WHERE frp.user_id = p_user_id 
    AND frp.round_id = p_round_id;
END;
$$;