-- Create a public leaderboard view that bypasses RLS restrictions
CREATE OR REPLACE VIEW public_fantasy_leaderboard AS
SELECT 
  frp.round_id,
  frp.user_id,
  frp.total_score,
  ROW_NUMBER() OVER (PARTITION BY frp.round_id ORDER BY frp.total_score DESC) AS position
FROM fantasy_round_picks frp
ORDER BY frp.round_id, frp.total_score DESC;

-- Enable RLS on the view
ALTER VIEW public_fantasy_leaderboard SET (security_barrier = true);

-- Create RLS policy to make leaderboard data publicly readable
CREATE POLICY "Public fantasy leaderboard is readable by everyone"
ON public_fantasy_leaderboard
FOR SELECT
TO public
USING (true);