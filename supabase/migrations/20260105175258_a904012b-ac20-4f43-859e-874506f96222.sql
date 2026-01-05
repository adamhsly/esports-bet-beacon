-- Create RPC function for admins to get paid round participants
CREATE OR REPLACE FUNCTION get_paid_round_participants()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (
      SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()
    ) = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

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
              'type', p.type,
              'created_at', p.created_at
            ) ORDER BY p.created_at
          )
          FROM (
            -- Users with picks (submitted teams)
            SELECT 
              frp.user_id,
              'pick' as type,
              frp.created_at
            FROM fantasy_round_picks frp
            WHERE frp.round_id = fr.id
            
            UNION ALL
            
            -- Users with reservations only (no picks)
            SELECT 
              rr.user_id,
              'reservation' as type,
              rr.created_at
            FROM round_reservations rr
            WHERE rr.round_id = fr.id
            AND NOT EXISTS (
              SELECT 1 FROM fantasy_round_picks frp2 
              WHERE frp2.round_id = fr.id AND frp2.user_id = rr.user_id
            )
          ) p
          LEFT JOIN profiles prof ON prof.id = p.user_id
        ),
        '[]'::json
      ) as participants
    FROM fantasy_rounds fr
    WHERE fr.is_paid = true
    AND fr.status IN ('scheduled', 'open')
    ORDER BY fr.start_date
  ) round_data;

  RETURN COALESCE(result, '[]'::json);
END;
$$;