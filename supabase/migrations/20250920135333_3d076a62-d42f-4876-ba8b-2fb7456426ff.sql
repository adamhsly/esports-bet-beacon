-- Create user_level_rewards table to track granted level rewards
CREATE TABLE public.user_level_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  level INTEGER NOT NULL,
  track TEXT NOT NULL CHECK (track IN ('free', 'premium')),
  reward_type TEXT NOT NULL,
  amount INTEGER,
  item_code TEXT,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, level, track, reward_type, COALESCE(item_code, ''))
);

-- Enable RLS on user_level_rewards
ALTER TABLE public.user_level_rewards ENABLE ROW LEVEL SECURITY;

-- Create policy for user_level_rewards
CREATE POLICY "Users can view their own level rewards" ON public.user_level_rewards
  FOR SELECT USING (auth.uid() = user_id);

-- Update grant_level_rewards function to convert credits to bonus credits and track grants
CREATE OR REPLACE FUNCTION public.grant_level_rewards(p_user uuid, p_level integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_premium boolean;
  v_row record;
  v_given jsonb := '[]'::jsonb;
begin
  -- Get user's premium status
  select coalesce(premium_pass,false) into v_premium
  from public.profiles where id = p_user;

  -- Process all level rewards for this level
  for v_row in
    select * from public.level_rewards
    where level = p_level
      and (track = 'free' or (track = 'premium' and v_premium))
  loop
    -- Check if this reward has already been granted
    if not exists (
      select 1 from public.user_level_rewards 
      where user_id = p_user 
        and level = p_level 
        and track = v_row.track 
        and reward_type = v_row.reward_type
        and coalesce(item_code, '') = coalesce(v_row.item_code, '')
    ) then
      
      if v_row.reward_type = 'credits' then
        -- Convert credits to bonus credits for fantasy use
        perform public.grant_bonus_credits(p_user, v_row.amount, 'level_reward');
        
        -- Track the reward grant
        insert into public.user_level_rewards(user_id, level, track, reward_type, amount)
        values (p_user, p_level, v_row.track, v_row.reward_type, v_row.amount);
        
        v_given := v_given || jsonb_build_object(
          'type','credits',
          'amount',v_row.amount,
          'track',v_row.track
        );
      else
        -- Handle item rewards
        insert into public.user_items(user_id, item_code, quantity, acquired_via, source_ref)
        values (p_user, v_row.item_code, 1, 'level_reward', jsonb_build_object('level', p_level))
        on conflict (user_id, item_code) do update
          set quantity = public.user_items.quantity + 1;
          
        -- Track the reward grant
        insert into public.user_level_rewards(user_id, level, track, reward_type, item_code)
        values (p_user, p_level, v_row.track, v_row.reward_type, v_row.item_code);
        
        v_given := v_given || jsonb_build_object(
          'type','item',
          'code',v_row.item_code,
          'track',v_row.track
        );
      end if;
    end if;
  end loop;

  return v_given;
end;
$function$;

-- Update award_xp function to call grant_level_rewards when leveling up
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
      update public.user_progress
        set streak_count = v_prog.streak_count + 1,
            last_active_date = v_today,
            updated_at = now()
      where user_id = v_user;
    else
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

-- Create function to retroactively grant missing level rewards
CREATE OR REPLACE FUNCTION public.retroactive_grant_level_rewards()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_user_record record;
  v_processed_count int := 0;
  v_credits_granted int := 0;
begin
  -- Process all users who have reached level 4 or higher
  for v_user_record in
    select user_id, level
    from public.user_progress
    where level >= 4
  loop
    -- Grant level rewards for levels 4 and up that haven't been granted yet
    for i in 4..v_user_record.level loop
      perform public.grant_level_rewards(v_user_record.user_id, i);
    end loop;
    
    v_processed_count := v_processed_count + 1;
  end loop;

  -- Count total credits granted
  select coalesce(sum(amount), 0) into v_credits_granted
  from public.user_level_rewards
  where reward_type = 'credits'
    and granted_at >= now() - interval '1 minute';

  return jsonb_build_object(
    'users_processed', v_processed_count,
    'credits_granted', v_credits_granted
  );
end;
$function$;

-- Run retroactive grant for existing users
SELECT public.retroactive_grant_level_rewards();