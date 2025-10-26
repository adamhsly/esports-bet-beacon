-- Fix consecutive days mission tracking in award_xp function
CREATE OR REPLACE FUNCTION public.award_xp(p_kind text, p_ref_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_now  timestamptz := now();
  v_today date := current_date;
  v_xp   int;
  v_prog record;
  v_new_xp int;
  v_new_level int;
  v_old_level int;
  v_unlocked int := 0;
  v_season uuid := public.active_season_id();
  v_level_rewards jsonb := '[]'::jsonb;
  v_new_streak int;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- XP rule (single row)
  select xp into v_xp
  from public.xp_rules
  where kind = p_kind
  limit 1;

  if v_xp is null then
    return jsonb_build_object('ok', false, 'reason', 'unknown_kind');
  end if;

  -- Idempotent event log (unchanged)
  if p_ref_id is not null then
    begin
      insert into public.user_events (user_id, kind, ref_id, xp_awarded, occurred_at)
      values (v_user, p_kind, p_ref_id, v_xp, v_now);
    exception when unique_violation then
      select * into v_prog from public.user_progress where user_id = v_user;
      return jsonb_build_object(
        'ok', true, 'deduped', true,
        'xp', coalesce(v_prog.xp,0),
        'level', coalesce(v_prog.level,1),
        'streak', coalesce(v_prog.streak_count,0),
        'unlocked_rewards_count', 0
      );
    end;
  else
    insert into public.user_events (user_id, kind, xp_awarded, occurred_at)
    values (v_user, p_kind, v_xp, v_now);
  end if;

  insert into public.user_progress (user_id, xp, level, streak_count, last_active_date)
  values (v_user, 0, 1, 0, v_today)
  on conflict (user_id) do nothing;

  select * into v_prog from public.user_progress where user_id = v_user for update;
  v_old_level := coalesce(v_prog.level, 1);

  if v_prog.last_active_date is null or v_prog.last_active_date < v_today then
    if v_prog.last_active_date = (v_today - 1) then
      v_new_streak := v_prog.streak_count + 1;
      update public.user_progress
        set streak_count = v_new_streak,
            last_active_date = v_today,
            updated_at = now()
      where user_id = v_user;
    else
      v_new_streak := 1;
      update public.user_progress
        set streak_count = 1,
            last_active_date = v_today,
            updated_at = now()
      where user_id = v_user;
    end if;

    perform public.increment_xp(v_user,
      coalesce((
        select xp from public.xp_rules
        where kind = 'streak_day'
        limit 1
      ), 0)
    );

    -- Progress consecutive days mission based on new streak count
    if v_new_streak >= 1 and v_new_streak <= 3 then
      perform public.progress_mission('w_3_consec_days', v_new_streak);
    end if;
  end if;

  perform public.increment_xp(v_user, v_xp);

  select xp, level, streak_count
  into v_new_xp, v_new_level, v_prog.streak_count
  from public.user_progress where user_id = v_user limit 1;

  -- Grant level rewards if user leveled up
  if v_new_level > v_old_level then
    for i in (v_old_level + 1)..v_new_level loop
      v_level_rewards := v_level_rewards || public.grant_level_rewards(v_user, i);
    end loop;
  end if;

  -- Handle season rewards
  if v_season is not null then
    with entitlement as (
      select coalesce(premium_pass,false) as premium
      from public.profiles where id = v_user
    ),
    candidates as (
      select r.id, r.tier
      from public.season_rewards r, entitlement e
      where r.season_id = v_season
        and r.level_required <= v_new_level
        and (r.tier = 'free' or (r.tier = 'premium' and e.premium = true))
    )
    insert into public.user_rewards (user_id, reward_id, unlocked, unlocked_at)
    select v_user, id, true, v_now from candidates
    on conflict (user_id, reward_id) do update
      set unlocked = true, unlocked_at = excluded.unlocked_at;

    get diagnostics v_unlocked = row_count;
  end if;

  return jsonb_build_object(
    'ok', true,
    'xp', v_new_xp,
    'level', v_new_level,
    'streak', v_prog.streak_count,
    'unlocked_rewards_count', coalesce(v_unlocked,0),
    'level_rewards', v_level_rewards
  );
end;
$function$;