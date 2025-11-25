-- Fix get_team_swap_state to allow swaps in both 'open' and 'active' rounds
CREATE OR REPLACE FUNCTION public.get_team_swap_state(p_round_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_swap_record RECORD;
  v_round_status TEXT;
BEGIN
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'old_team_id', null,
      'new_team_id', null,
      'swap_used', false,
      'can_swap', false,
      'points_at_swap', 0
    );
  END IF;

  -- Get round status
  SELECT status INTO v_round_status
  FROM fantasy_rounds
  WHERE id = p_round_id;

  -- Get swap record
  SELECT * INTO v_swap_record
  FROM fantasy_round_team_swaps
  WHERE user_id = v_user_id AND round_id = p_round_id;

  -- Determine if user can swap
  -- Can swap if: no swap yet, or round is open/active and swap not used
  RETURN jsonb_build_object(
    'old_team_id', COALESCE(v_swap_record.old_team_id, null),
    'new_team_id', COALESCE(v_swap_record.new_team_id, null),
    'swap_used', COALESCE(v_swap_record.swap_used, false),
    'can_swap', CASE 
      WHEN v_swap_record.id IS NULL THEN true  -- No swap yet
      WHEN v_round_status IN ('open', 'active') AND NOT COALESCE(v_swap_record.swap_used, false) THEN true
      ELSE false
    END,
    'points_at_swap', COALESCE(v_swap_record.points_at_swap, 0),
    'swapped_at', v_swap_record.swapped_at
  );
END;
$$;