
-- Drop and recreate the function to use summed scores from fantasy_round_scores
CREATE OR REPLACE FUNCTION public.get_public_fantasy_leaderboard(p_round_id uuid, p_limit integer DEFAULT NULL::integer)
RETURNS TABLE(user_id uuid, total_score integer, user_position integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    frs.user_id,
    COALESCE(SUM(frs.current_score), 0)::integer AS total_score,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(frs.current_score), 0) DESC, frs.user_id)::integer AS user_position
  FROM public.fantasy_round_scores frs
  WHERE frs.round_id = p_round_id
  GROUP BY frs.user_id
  ORDER BY total_score DESC, frs.user_id
  LIMIT COALESCE(p_limit, 10000);
$function$;
