-- Public fantasy leaderboard RPC that bypasses RLS via SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_public_fantasy_leaderboard(
  p_round_id uuid,
  p_limit integer DEFAULT NULL
)
RETURNS TABLE(user_id uuid, total_score integer, user_position integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    frp.user_id,
    frp.total_score,
    ROW_NUMBER() OVER (ORDER BY frp.total_score DESC, frp.user_id)::integer AS user_position
  FROM public.fantasy_round_picks frp
  WHERE frp.round_id = p_round_id
  ORDER BY frp.total_score DESC, frp.user_id
  LIMIT COALESCE(p_limit, 10000);
$$;

-- Allow clients to call the RPC
GRANT EXECUTE ON FUNCTION public.get_public_fantasy_leaderboard(uuid, integer) TO anon, authenticated;