-- Fix critical security issues: Remove public profile exposure and enable RLS on user_items

-- 1. Drop the overly permissive public read policy on profiles
-- This policy allowed ANYONE (including unauthenticated users) to read ALL profiles
DROP POLICY IF EXISTS "profiles_read" ON public.profiles;

-- Profiles table already has proper restrictive policies:
-- - "Users can view own profile" (auth.uid() = id)
-- - "Users can update own profile" (auth.uid() = id)  
-- - "Users can insert own profile" (auth.uid() = id)
-- These remain in place and are sufficient

-- 2. Enable RLS on user_items table to prevent unauthorized access
ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;

-- Allow users to view only their own items
CREATE POLICY "Users can view own items"
  ON public.user_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only service role can insert/update items (prevents client-side item generation exploits)
-- Users acquire items through backend functions that use service role
CREATE POLICY "Service role can manage items"
  ON public.user_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);