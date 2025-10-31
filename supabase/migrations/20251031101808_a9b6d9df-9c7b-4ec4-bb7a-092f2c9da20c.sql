-- Allow public read access to basic profile information for leaderboards
-- This enables usernames and avatars to display on leaderboards and other public features
CREATE POLICY "Public can view basic profile info"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);