-- Add columns to track previous star team and when the star was changed
ALTER TABLE fantasy_round_star_teams 
ADD COLUMN IF NOT EXISTS previous_star_team_id TEXT,
ADD COLUMN IF NOT EXISTS star_changed_at TIMESTAMPTZ;

-- Update the set_star_team function to track the previous star team
CREATE OR REPLACE FUNCTION set_star_team(p_round_id uuid, p_team_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_round_started boolean;
  v_existing RECORD;
  v_change_used boolean := FALSE;
  v_previous_star_team_id text := NULL;
BEGIN
  -- Get the authenticated user's ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Check if round has started
  SELECT EXISTS (
    SELECT 1 FROM fantasy_rounds 
    WHERE id = p_round_id 
    AND start_date <= now()
  ) INTO v_round_started;

  -- Get existing star team record
  SELECT * INTO v_existing 
  FROM fantasy_round_star_teams 
  WHERE user_id = v_user_id AND round_id = p_round_id;

  -- Mark change as used if round HAS STARTED and user already has a star team
  IF v_existing.id IS NOT NULL AND v_round_started THEN
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