-- Fix profiles table RLS to prevent public data exposure
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;

-- Ensure RLS is enabled on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view only their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update only their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Users can insert only their own profile
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Enable RLS on user data tables
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for credit_transactions (user-specific data)
CREATE POLICY "Users can view own credit transactions"
ON credit_transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Enable RLS on non-view tables that need it
ALTER TABLE currency_kinds ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_rewards ENABLE ROW LEVEL SECURITY;

-- Public read access for reference data tables
CREATE POLICY "Public read currency_kinds"
ON currency_kinds FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public read level_rewards"
ON level_rewards FOR SELECT
TO anon, authenticated
USING (true);