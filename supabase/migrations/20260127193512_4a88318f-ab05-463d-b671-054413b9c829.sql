
-- Fix the get_paid_round_participants function to correctly handle free/paid status
-- Reservations should not show as paid/free since payment only happens on submission
CREATE OR REPLACE FUNCTION public.get_paid_round_participants()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(round_data) INTO result
  FROM (
    SELECT 
      fr.id,
      fr.round_name,
      fr.type,
      fr.status,
      fr.entry_fee,
      fr.start_date,
      fr.end_date,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'user_id', p.user_id,
              'username', prof.username,
              'email', au.email,
              'type', p.type,
              'created_at', p.created_at,
              'is_free_ticket', p.is_free_ticket
            ) ORDER BY p.created_at
          )
          FROM (
            -- Users with picks (submitted teams) - these have paid or used free ticket
            SELECT 
              frp.user_id,
              'pick' as type,
              frp.created_at,
              CASE WHEN COALESCE(re.promo_used, 0) > 0 THEN true ELSE false END as is_free_ticket
            FROM fantasy_round_picks frp
            LEFT JOIN round_entries re ON re.round_id = frp.round_id AND re.user_id = frp.user_id
            WHERE frp.round_id = fr.id
            
            UNION ALL
            
            -- Users with reservations only (no picks) - payment status is NULL since they haven't paid yet
            SELECT 
              rr.user_id,
              'reservation' as type,
              rr.created_at,
              NULL::boolean as is_free_ticket  -- NULL indicates not yet paid
            FROM round_reservations rr
            WHERE rr.round_id = fr.id
            AND NOT EXISTS (
              SELECT 1 FROM fantasy_round_picks frp2 
              WHERE frp2.round_id = fr.id AND frp2.user_id = rr.user_id
            )
          ) p
          LEFT JOIN profiles prof ON prof.id = p.user_id
          LEFT JOIN auth.users au ON au.id = p.user_id
        ),
        '[]'::json
      ) as participants
    FROM fantasy_rounds fr
    WHERE fr.is_paid = true
    AND fr.status IN ('scheduled', 'open', 'in_progress', 'finished')
    ORDER BY fr.start_date DESC
  ) round_data;

  RETURN COALESCE(result, '[]'::json);
END;
$$;
