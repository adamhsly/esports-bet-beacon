-- Allow public read access to fantasy round scores for leaderboard viewing
CREATE POLICY "Fantasy round scores are publicly viewable"
ON public.fantasy_round_scores
FOR SELECT
USING (true);

-- Allow public read access to fantasy round star teams for leaderboard viewing
CREATE POLICY "Fantasy round star teams are publicly viewable"
ON public.fantasy_round_star_teams
FOR SELECT
USING (true);