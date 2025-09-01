-- Fix signup failure caused by trigger calling functions that require auth.uid()
-- 1) Update on_profile_created to set request.jwt.claims so auth.uid() resolves to NEW.id during signup
-- 2) Ensure triggers exist for auth.users -> handle_new_user and public.profiles -> on_profile_created

-- 1) Replace on_profile_created with a safe implementation
CREATE OR REPLACE FUNCTION public.on_profile_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  -- Seed progress row if missing (no auth required)
  insert into public.user_progress (user_id, xp, level, streak_count, last_active_date)
  values (new.id, 0, 1, 0, current_date)
  on conflict (user_id) do nothing;

  -- Impersonate the new user so functions relying on auth.uid() work inside this transaction
  perform set_config('request.jwt.claims', json_build_object('sub', new.id)::text, true);

  -- Seed user missions for the new user (uses auth.uid() internally)
  perform public.seed_user_missions();

  return new;
end
$$;

-- 2) Create/ensure triggers
-- Trigger: when a user is created in auth.users, create a profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: when a profile row is created, run on_profile_created
DROP TRIGGER IF EXISTS on_public_profile_created ON public.profiles;
CREATE TRIGGER on_public_profile_created
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.on_profile_created();