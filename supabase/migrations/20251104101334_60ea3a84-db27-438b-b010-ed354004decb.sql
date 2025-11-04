-- Allow public read access to fantasy round picks for leaderboard viewing
CREATE POLICY "Fantasy round picks are publicly viewable"
ON public.fantasy_round_picks
FOR SELECT
USING (true);