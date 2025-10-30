-- Create next_monthly_reset_utc function
CREATE OR REPLACE FUNCTION public.next_monthly_reset_utc(ts timestamp with time zone DEFAULT now())
RETURNS timestamp with time zone
LANGUAGE sql
IMMUTABLE
AS $function$
  -- First day of next month at 00:00 UTC
  SELECT (date_trunc('month', ts) + interval '1 month') at time zone 'UTC'
$function$;

-- Drop and recreate progress_mission with monthly reset support
DROP FUNCTION IF EXISTS public.progress_mission(text, integer);

CREATE OR REPLACE FUNCTION public.progress_mission(p_code text, p_inc integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
      WHEN 'monthly' THEN public.next_monthly_reset_utc(v_now)
      ELSE NULL
    END
  )
  ON CONFLICT (user_id, mission_id) DO NOTHING;

  -- Get current user mission state
  SELECT * INTO v_user_mission
  FROM public.user_missions
  WHERE user_id = v_user AND mission_id = v_mission.id
  FOR UPDATE;

  -- Check if mission needs to be reset
  IF v_user_mission.reset_at IS NOT NULL AND v_user_mission.reset_at <= v_now THEN
    -- Calculate new reset_at
    UPDATE public.user_missions
    SET progress = 0,
        completed = false,
        completed_at = NULL,
        reset_at = CASE v_mission.kind
          WHEN 'daily' THEN public.next_daily_reset_utc(v_now)
          WHEN 'weekly' THEN public.next_weekly_reset_utc(v_now)
          WHEN 'monthly' THEN public.next_monthly_reset_utc(v_now)
          ELSE NULL
        END,
        updated_at = v_now
    WHERE user_id = v_user AND mission_id = v_mission.id;
    
    -- Refresh the user_mission record
    SELECT * INTO v_user_mission
    FROM public.user_missions
    WHERE user_id = v_user AND mission_id = v_mission.id;
  END IF;

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

-- Drop and recreate seed_user_missions with monthly reset support
DROP FUNCTION IF EXISTS public.seed_user_missions();

CREATE OR REPLACE FUNCTION public.seed_user_missions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_now timestamptz := now();
BEGIN
  IF v_user IS NULL THEN
    RAISE exception 'Not authenticated';
  END IF;

  -- Ensure a user_missions row exists for every active mission, with correct reset window
  INSERT INTO public.user_missions (user_id, mission_id, progress, completed, reset_at)
  SELECT v_user, m.id, 0, false,
         CASE m.kind
           WHEN 'daily' THEN public.next_daily_reset_utc(v_now)
           WHEN 'weekly' THEN public.next_weekly_reset_utc(v_now)
           WHEN 'monthly' THEN public.next_monthly_reset_utc(v_now)
           ELSE NULL
         END
  FROM public.missions m
  WHERE m.active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.user_missions um
      WHERE um.user_id = v_user AND um.mission_id = m.id
    );
END;
$function$;