-- Fix MASONIC score mismatch by syncing current_score with breakdown sum
-- Also delete the stale breakdown entry for cancelled match 1326175

-- Delete the stale breakdown entry for the cancelled match
DELETE FROM fantasy_team_match_breakdown
WHERE match_id = '1326175';

-- Update MASONIC's current_score to match breakdown sum for the current round
UPDATE fantasy_round_scores
SET current_score = (
  SELECT COALESCE(SUM(points_earned), 0)
  FROM fantasy_team_match_breakdown
  WHERE fantasy_team_match_breakdown.user_id = fantasy_round_scores.user_id
    AND fantasy_team_match_breakdown.team_id = fantasy_round_scores.team_id
    AND fantasy_team_match_breakdown.round_id = fantasy_round_scores.round_id
),
last_updated = now()
WHERE team_id = '127911'
AND round_id = 'ee62f5ed-b396-4030-b142-f4c528ae55e6';