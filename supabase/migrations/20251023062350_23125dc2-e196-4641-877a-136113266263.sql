-- Create the progress_mission RPC function to handle mission progress and XP awards
CREATE OR REPLACE FUNCTION public.progress_mission(p_code text, p_inc integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_mission record;
  v_user_mission record;
  v_new_progress int;
  v_completed bool := false;
  v_awarded_xp int := 0;
  v_now timestamptz := now();
BEGIN
  -- Check authentication
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not authenticated');
  END IF;

  -- Get mission details
  SELECT * INTO v_mission
  FROM public.missions
  WHERE code = p_code AND active = true
  LIMIT 1;

  IF v_mission.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'mission not found');
  END IF;

  -- Get or create user mission record
  INSERT INTO public.user_missions (user_id, mission_id, progress, completed, reset_at)
  VALUES (
    v_user, 
    v_mission.id, 
    0, 
    false,
    CASE v_mission.kind
      WHEN 'daily' THEN public.next_daily_reset_utc(v_now)
      WHEN 'weekly' THEN public.next_weekly_reset_utc(v_now)
      ELSE NULL
    END
  )
  ON CONFLICT (user_id, mission_id) DO NOTHING;

  -- Get current user mission state
  SELECT * INTO v_user_mission
  FROM public.user_missions
  WHERE user_id = v_user AND mission_id = v_mission.id
  FOR UPDATE;

  -- If already completed, return early
  IF v_user_mission.completed THEN
    RETURN jsonb_build_object(
      'ok', true,
      'completed', true,
      'already_completed', true,
      'awarded_xp', 0
    );
  END IF;

  -- Update progress
  v_new_progress := v_user_mission.progress + p_inc;

  -- Check if mission is now completed
  IF v_new_progress >= v_mission.target THEN
    v_completed := true;
    v_awarded_xp := v_mission.xp_reward;

    -- Award XP using the award_xp function
    PERFORM public.award_xp(v_mission.code::text, v_mission.id::text);

    -- Mark mission as completed
    UPDATE public.user_missions
    SET progress = v_new_progress,
        completed = true,
        completed_at = v_now,
        updated_at = v_now
    WHERE user_id = v_user AND mission_id = v_mission.id;
  ELSE
    -- Just update progress
    UPDATE public.user_missions
    SET progress = v_new_progress,
        updated_at = v_now
    WHERE user_id = v_user AND mission_id = v_mission.id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'completed', v_completed,
    'awarded_xp', v_awarded_xp,
    'progress', v_new_progress,
    'target', v_mission.target
  );
END;
$function$;