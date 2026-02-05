-- Fix star team swap timing + change limits for current round status model

CREATE OR REPLACE FUNCTION public.set_star_team(p_round_id uuid, p_team_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_round_status text;
  v_existing record;
  v_change_used boolean := false;
  v_previous_star_team_id text := null;
  v_star_changed_at timestamptz := null;
BEGIN
  -- Get the authenticated user's ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Get round status
  SELECT status
  INTO v_round_status
  FROM public.fantasy_rounds
  WHERE id = p_round_id;

  IF v_round_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round not found');
  END IF;

  -- Only allow changes for scheduled/open/active rounds
  IF v_round_status NOT IN ('scheduled', 'open', 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round is not active');
  END IF;

  -- Get existing star team record
  SELECT *
  INTO v_existing
  FROM public.fantasy_round_star_teams
  WHERE user_id = v_user_id
    AND round_id = p_round_id;

  -- No-op if unchanged
  IF v_existing.id IS NOT NULL AND v_existing.star_team_id = p_team_id THEN
    RETURN jsonb_build_object(
      'success', true,
      'star_team_id', p_team_id,
      'change_used', COALESCE(v_existing.change_used, false)
    );
  END IF;

  -- Enforce exactly one change once the round has started (open/active)
  -- Scheduled = pre-start configuration, unlimited changes.
  IF v_existing.id IS NOT NULL AND v_round_status IN ('open', 'active') THEN
    IF COALESCE(v_existing.change_used, false) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Star team change already used this round');
    END IF;

    v_change_used := true;
    v_previous_star_team_id := v_existing.star_team_id;
    v_star_changed_at := now();
  END IF;

  -- Insert or update star team
  INSERT INTO public.fantasy_round_star_teams (
    user_id,
    round_id,
    star_team_id,
    change_used,
    updated_at,
    previous_star_team_id,
    star_changed_at
  )
  VALUES (
    v_user_id,
    p_round_id,
    p_team_id,
    v_change_used,
    now(),
    v_previous_star_team_id,
    v_star_changed_at
  )
  ON CONFLICT (user_id, round_id)
  DO UPDATE SET
    star_team_id = EXCLUDED.star_team_id,
    -- Preserve change_used flag once set to TRUE
    change_used = public.fantasy_round_star_teams.change_used OR EXCLUDED.change_used,
    -- Only set previous_star_team_id/star_changed_at on the FIRST in-round change
    previous_star_team_id = CASE
      WHEN NOT public.fantasy_round_star_teams.change_used AND EXCLUDED.change_used
        THEN EXCLUDED.previous_star_team_id
      ELSE public.fantasy_round_star_teams.previous_star_team_id
    END,
    star_changed_at = CASE
      WHEN NOT public.fantasy_round_star_teams.change_used AND EXCLUDED.change_used
        THEN EXCLUDED.star_changed_at
      ELSE public.fantasy_round_star_teams.star_changed_at
    END,
    updated_at = now();

  -- Get the actual value from database after upsert
  SELECT change_used
  INTO v_change_used
  FROM public.fantasy_round_star_teams
  WHERE user_id = v_user_id
    AND round_id = p_round_id;

  RETURN jsonb_build_object(
    'success', true,
    'star_team_id', p_team_id,
    'change_used', v_change_used
  );
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_star_team_state(p_round_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_star_record RECORD;
  v_round_status TEXT;
BEGIN
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'star_team_id', null,
      'change_used', false,
      'can_change', false
    );
  END IF;

  -- Get round status
  SELECT status
  INTO v_round_status
  FROM public.fantasy_rounds
  WHERE id = p_round_id;

  -- Get star team record
  SELECT *
  INTO v_star_record
  FROM public.fantasy_round_star_teams
  WHERE user_id = v_user_id
    AND round_id = p_round_id;

  -- Can change if:
  -- 1) no star set yet, OR
  -- 2) round is scheduled (pre-start), OR
  -- 3) round is open/active (in progress) AND change not used
  RETURN jsonb_build_object(
    'star_team_id', COALESCE(v_star_record.star_team_id, null),
    'change_used', COALESCE(v_star_record.change_used, false),
    'can_change', CASE
      WHEN v_star_record.id IS NULL THEN true
      WHEN v_round_status = 'scheduled' THEN true
      WHEN v_round_status IN ('open', 'active') AND NOT COALESCE(v_star_record.change_used, false) THEN true
      ELSE false
    END
  );
END;
$function$;
