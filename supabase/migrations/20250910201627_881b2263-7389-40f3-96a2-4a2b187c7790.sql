-- Add marketing preferences and terms acceptance columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN marketing_preferences jsonb DEFAULT '{}',
ADD COLUMN terms_accepted boolean NOT NULL DEFAULT false,
ADD COLUMN terms_accepted_at timestamp with time zone;

-- Add unique constraints for duplicate prevention
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_unique UNIQUE (username),
ADD CONSTRAINT profiles_full_name_unique UNIQUE (full_name);

-- Update the handle_new_user function to include new fields
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
    COALESCE((NEW.raw_user_meta_data ->> 'marketing_preferences')::jsonb, '{}'),
    COALESCE((NEW.raw_user_meta_data ->> 'terms_accepted')::boolean, false),
    CASE 
      WHEN COALESCE((NEW.raw_user_meta_data ->> 'terms_accepted')::boolean, false) 
      THEN now() 
      ELSE NULL 
    END
  );
  RETURN NEW;
END;
$$;