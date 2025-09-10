-- Safe schema updates without failing on existing duplicates
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'marketing_preferences'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN marketing_preferences jsonb DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'terms_accepted'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN terms_accepted boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'terms_accepted_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN terms_accepted_at timestamptz;
  END IF;
END $$;

-- Update the handle_new_user function to include new fields (idempotent)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    marketing_preferences,
    terms_accepted,
    terms_accepted_at
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'username',
    NEW.raw_user_meta_data ->> 'full_name',
    COALESCE((NEW.raw_user_meta_data ->> 'marketing_preferences')::jsonb, '{}'::jsonb),
    COALESCE((NEW.raw_user_meta_data ->> 'terms_accepted')::boolean, false),
    CASE WHEN COALESCE((NEW.raw_user_meta_data ->> 'terms_accepted')::boolean, false)
         THEN now() ELSE NULL END
  );
  RETURN NEW;
END;
$$;

-- Security definer function to check duplicates without exposing tables publicly
CREATE OR REPLACE FUNCTION public.check_registration_duplicates(
  p_email text,
  p_username text,
  p_full_name text
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email_exists boolean := false;
  v_username_exists boolean := false;
  v_full_name_exists boolean := false;
BEGIN
  -- Email exists in auth.users (case-insensitive)
  IF p_email IS NOT NULL AND length(trim(p_email)) > 0 THEN
    SELECT EXISTS(
      SELECT 1 FROM auth.users u WHERE lower(u.email) = lower(p_email)
    ) INTO v_email_exists;
  END IF;

  -- Username exists in public.profiles (case-insensitive)
  IF p_username IS NOT NULL AND length(trim(p_username)) > 0 THEN
    SELECT EXISTS(
      SELECT 1 FROM public.profiles WHERE lower(username) = lower(p_username)
    ) INTO v_username_exists;
  END IF;

  -- Full name exists in public.profiles (case-insensitive)
  IF p_full_name IS NOT NULL AND length(trim(p_full_name)) > 0 THEN
    SELECT EXISTS(
      SELECT 1 FROM public.profiles WHERE lower(full_name) = lower(p_full_name)
    ) INTO v_full_name_exists;
  END IF;

  RETURN jsonb_build_object(
    'email', v_email_exists,
    'username', v_username_exists,
    'full_name', v_full_name_exists
  );
END;
$$;