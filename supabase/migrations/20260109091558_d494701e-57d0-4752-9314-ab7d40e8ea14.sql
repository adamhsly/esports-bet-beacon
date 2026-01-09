-- Create RPC function to get private round participants
CREATE OR REPLACE FUNCTION public.get_private_round_participants()
RETURNS TABLE (
  id uuid,
  round_name text,
  type text,
  status text,
  start_date timestamptz,
  end_date timestamptz,
  join_code text,
  organiser_id uuid,
  organiser_username text,
  organiser_email text,
  participants jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fr.id,
    fr.round_name,
    fr.type,
    fr.status,
    fr.start_date,
    fr.end_date,
    fr.join_code,
    fr.created_by as organiser_id,
    p.username as organiser_username,
    au.email as organiser_email,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'user_id', picks.user_id,
            'username', pick_profile.username,
            'email', pick_auth.email,
            'created_at', picks.created_at
          )
          ORDER BY picks.created_at DESC
        )
        FROM fantasy_round_picks picks
        LEFT JOIN profiles pick_profile ON pick_profile.id = picks.user_id
        LEFT JOIN auth.users pick_auth ON pick_auth.id = picks.user_id
        WHERE picks.round_id = fr.id
      ),
      '[]'::jsonb
    ) as participants
  FROM fantasy_rounds fr
  LEFT JOIN profiles p ON p.id = fr.created_by
  LEFT JOIN auth.users au ON au.id = fr.created_by
  WHERE fr.is_private = true
    AND fr.status IN ('open', 'scheduled', 'in_progress')
  ORDER BY fr.start_date ASC;
END;
$$;