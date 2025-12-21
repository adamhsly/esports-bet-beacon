-- Ensure leaderboard includes participants who submitted picks but don't have scores yet
CREATE OR REPLACE FUNCTION public.get_public_fantasy_leaderboard(
  p_round_id uuid,
  p_limit integer DEFAULT NULL::integer
)
RETURNS TABLE(user_id uuid, total_score integer, user_position integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH participants AS (
    SELECT frp.user_id
    FROM public.fantasy_round_picks frp
    WHERE frp.round_id = p_round_id

    UNION

    SELECT frs.user_id
    FROM public.fantasy_round_scores frs
    WHERE frs.round_id = p_round_id
  ),
  totals AS (
    SELECT
      p.user_id,
      COALESCE(SUM(frs.current_score), 0)::integer AS total_score
    FROM participants p
    LEFT JOIN public.fantasy_round_scores frs
      ON frs.round_id = p_round_id
     AND frs.user_id = p.user_id
    GROUP BY p.user_id
  )
  SELECT
    t.user_id,
    t.total_score,
    ROW_NUMBER() OVER (ORDER BY t.total_score DESC, t.user_id)::integer AS user_position
  FROM totals t
  ORDER BY t.total_score DESC, t.user_id
  LIMIT COALESCE(p_limit, 10000);
$function$;