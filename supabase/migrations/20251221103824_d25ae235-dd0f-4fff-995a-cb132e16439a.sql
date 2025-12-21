-- Add partial index on profiles.test column for testusersfantasypicks queries
CREATE INDEX IF NOT EXISTS idx_profiles_test ON public.profiles(test) WHERE test = true;

-- Add index on id for RLS authenticated queries (covers auth.uid() lookups)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(id);

-- Add composite index for premium pass checks
CREATE INDEX IF NOT EXISTS idx_profiles_premium ON public.profiles(id, premium_pass);