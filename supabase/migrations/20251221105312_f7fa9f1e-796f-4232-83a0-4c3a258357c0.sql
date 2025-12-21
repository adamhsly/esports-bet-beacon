-- Fix set_star_team function to limit changes once round has started
CREATE OR REPLACE FUNCTION public.set_star_team(p_round_id uuid, p_team_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing RECORD;
  v_round RECORD;
  v_change_used BOOLEAN := FALSE;
  v_round_started BOOLEAN := FALSE;
BEGIN
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get round details including start_date
  SELECT status, start_date INTO v_round
  FROM fantasy_rounds
  WHERE id = p_round_id;

  IF v_round.status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round not found');
  END IF;

  -- Allow scheduled, open, and active rounds
  IF v_round.status NOT IN ('scheduled', 'open', 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round is not active');
  END IF;

  -- Check if round has actually started (based on time, not just status)
  v_round_started := NOW() >= v_round.start_date;

  -- Check if user has picks for this round
  IF NOT EXISTS (
    SELECT 1 FROM fantasy_round_picks 
    WHERE user_id = v_user_id AND round_id = p_round_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No team picks found for this round');
  END IF;

  -- Get existing star team record
  SELECT * INTO v_existing
  FROM fantasy_round_star_teams
  WHERE user_id = v_user_id AND round_id = p_round_id;

  -- Mark change as used if round HAS STARTED and user already has a star team
  IF v_existing.id IS NOT NULL AND v_round_started THEN
    v_change_used := TRUE;
    
    -- Check if they already used their change
    IF v_existing.change_used THEN
      RETURN jsonb_build_object('success', false, 'error', 'Star team change already used this round');
    END IF;
  END IF;

  -- Insert or update star team
  INSERT INTO fantasy_round_star_teams (user_id, round_id, star_team_id, change_used, updated_at)
  VALUES (v_user_id, p_round_id, p_team_id, v_change_used, now())
  ON CONFLICT (user_id, round_id) 
  DO UPDATE SET 
    star_team_id = EXCLUDED.star_team_id,
    -- Preserve change_used flag once set to TRUE
    change_used = fantasy_round_star_teams.change_used OR EXCLUDED.change_used,
    updated_at = now();

  -- Get the actual value from database after upsert
  SELECT change_used INTO v_change_used
  FROM fantasy_round_star_teams
  WHERE user_id = v_user_id AND round_id = p_round_id;

  RETURN jsonb_build_object(
    'success', true,
    'star_team_id', p_team_id,
    'change_used', v_change_used
  );
END;
$function$;