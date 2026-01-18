
-- Fix the star_changed_at to Friday Jan 16 at 09:00 UTC
UPDATE fantasy_round_star_teams
SET star_changed_at = '2026-01-16 09:00:00+00'
WHERE user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
  AND star_team_id = '134188'
  AND previous_star_team_id = '132494';

-- Apply star multiplier to all Jan 16 matches (they're all after 09:00)
-- Double the points for the 6 matches that weren't multiplied
UPDATE fantasy_team_match_breakdown
SET points_earned = points_earned * 2,
    star_multiplier_applied = true
WHERE user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
  AND team_id = '134188'
  AND round_id = (SELECT id FROM fantasy_rounds WHERE round_name = 'Weekly Pro - Paid - Week of Jan 12' LIMIT 1)
  AND star_multiplier_applied = false
  AND match_date >= '2026-01-16 09:00:00+00';

-- Update the fantasy_round_scores current_score for Johnny Speeds
UPDATE fantasy_round_scores
SET current_score = (
  SELECT COALESCE(SUM(points_earned), 0)
  FROM fantasy_team_match_breakdown
  WHERE fantasy_team_match_breakdown.user_id = fantasy_round_scores.user_id
    AND fantasy_team_match_breakdown.team_id = fantasy_round_scores.team_id
    AND fantasy_team_match_breakdown.round_id = fantasy_round_scores.round_id
),
last_updated = now()
WHERE user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
  AND team_id = '134188'
  AND round_id = (SELECT id FROM fantasy_rounds WHERE round_name = 'Weekly Pro - Paid - Week of Jan 12' LIMIT 1);

-- Update the total_score in fantasy_round_picks
UPDATE fantasy_round_picks
SET total_score = (
  SELECT COALESCE(SUM(current_score), 0)
  FROM fantasy_round_scores
  WHERE fantasy_round_scores.user_id = fantasy_round_picks.user_id
    AND fantasy_round_scores.round_id = fantasy_round_picks.round_id
),
updated_at = now()
WHERE user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
  AND round_id = (SELECT id FROM fantasy_rounds WHERE round_name = 'Weekly Pro - Paid - Week of Jan 12' LIMIT 1);
