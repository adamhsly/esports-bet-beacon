
-- Fix the set_star_team function to use round status instead of start_date
-- This prevents users from losing their star change when submitting picks during an "open" round
CREATE OR REPLACE FUNCTION public.set_star_team(p_round_id uuid, p_team_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_round_status text;
  v_existing RECORD;
  v_change_used boolean := FALSE;
  v_previous_star_team_id text := NULL;
BEGIN
  -- Get the authenticated user's ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Get round status
  SELECT status INTO v_round_status
  FROM fantasy_rounds 
  WHERE id = p_round_id;

  IF v_round_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round not found');
  END IF;

  -- Only allow changes for scheduled, open, or active rounds
  IF v_round_status NOT IN ('scheduled', 'open', 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round is not active');
  END IF;

  -- Get existing star team record
  SELECT * INTO v_existing 
  FROM fantasy_round_star_teams 
  WHERE user_id = v_user_id AND round_id = p_round_id;

  -- Mark change as used ONLY if round is "active" (not scheduled or open) and user already has a star team
  -- This allows unlimited changes during open/scheduled rounds, but only one change during active
  IF v_existing.id IS NOT NULL AND v_round_status = 'active' THEN
    v_change_used := TRUE;
    v_previous_star_team_id := v_existing.star_team_id;
    
    -- Check if they already used their change
    IF v_existing.change_used THEN
      RETURN jsonb_build_object('success', false, 'error', 'Star team change already used this round');
    END IF;
  END IF;

  -- Insert or update star team
  INSERT INTO fantasy_round_star_teams (
    user_id, round_id, star_team_id, change_used, updated_at, 
    previous_star_team_id, star_changed_at
  )
  VALUES (
    v_user_id, p_round_id, p_team_id, v_change_used, now(),
    v_previous_star_team_id, CASE WHEN v_change_used THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id, round_id) 
  DO UPDATE SET 
    star_team_id = EXCLUDED.star_team_id,
    -- Preserve change_used flag once set to TRUE
    change_used = fantasy_round_star_teams.change_used OR EXCLUDED.change_used,
    -- Only update previous_star_team_id if this is the first change (change_used was false)
    previous_star_team_id = CASE 
      WHEN NOT fantasy_round_star_teams.change_used AND EXCLUDED.change_used 
      THEN EXCLUDED.previous_star_team_id 
      ELSE fantasy_round_star_teams.previous_star_team_id 
    END,
    -- Only update star_changed_at if this is the first change
    star_changed_at = CASE 
      WHEN NOT fantasy_round_star_teams.change_used AND EXCLUDED.change_used 
      THEN now() 
      ELSE fantasy_round_star_teams.star_changed_at 
    END,
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

-- Fix 1danne1's record for the current round - reset change_used since they haven't actually changed anything
UPDATE fantasy_round_star_teams
SET 
  change_used = false,
  previous_star_team_id = NULL,
  star_changed_at = NULL,
  updated_at = now()
WHERE user_id = '06f2afbc-b1ec-4f0a-bfeb-226f7af7ba1a'
  AND round_id = 'fd1c8cc4-ad0b-4503-864d-771996d8dbb3';
