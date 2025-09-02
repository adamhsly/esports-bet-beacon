-- Fix progress_mission too_many_rows by disambiguating mission selection
CREATE OR REPLACE FUNCTION public.progress_mission(p_code text, p_inc integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_uid uuid := auth.uid();
  v_m   public.missions%rowtype;
  v_um  public.user_missions%rowtype;
  v_now timestamptz := now();
  v_completed_now boolean := false;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  -- Select a single active mission by code deterministically
  select * into v_m
  from public.missions
  where code = p_code and active = true
  order by created_at desc, id desc
  limit 1;

  if not found then
    raise exception 'mission % not found or inactive', p_code;
  end if;

  -- Upsert user progress row and clamp progress to target
  insert into public.user_missions(user_id, mission_id, progress, completed, reset_at, updated_at)
  values (v_uid, v_m.id, least(p_inc, v_m.target), false, null, v_now)
  on conflict (user_id, mission_id) do update
    set progress = least(public.user_missions.progress + p_inc, v_m.target),
        updated_at = v_now
  returning * into v_um;

  -- Mark completed and award XP once when threshold is reached
  if v_um.progress >= v_m.target and v_um.completed = false then
    update public.user_missions
      set completed = true, updated_at = v_now
      where user_id = v_uid and mission_id = v_m.id
      returning * into v_um;

    v_completed_now := true;
    perform public.award_xp(v_m.code, v_m.id::text);
  end if;

  return jsonb_build_object(
    'code', v_m.code, 'title', v_m.title, 'kind', v_m.kind,
    'progress', v_um.progress, 'target', v_m.target,
    'completed', v_um.completed, 'completedNow', v_completed_now,
    'xpRuleKind', v_m.code
  );
end;
$$;