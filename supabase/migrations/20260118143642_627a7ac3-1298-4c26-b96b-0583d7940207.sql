-- Update star_changed_at to Friday morning (Jan 17, 2026 at 09:00 UTC) for soldierce (cedric.creelle@gmail.com)
-- He has two rounds with star changes - we need to update the Weekly Pro Paid one

-- First identify which round is the Weekly Pro Paid (the one with ZennIT -> Johnny Speeds, team 132494 -> 134188)
UPDATE fantasy_round_star_teams
SET star_changed_at = '2026-01-17 09:00:00+00'
WHERE user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
  AND previous_star_team_id = '132494'
  AND star_team_id = '134188';

-- Get the round_id for this star change
-- Now update Johnny Speeds (team 134188) matches - apply star multiplier ONLY for matches AFTER Friday morning

-- First, normalize all Johnny Speeds scores back to base (remove any existing star multiplier)
UPDATE fantasy_team_match_breakdown
SET 
  points_earned = CASE 
    WHEN star_multiplier_applied = true THEN points_earned / 2 
    ELSE points_earned 
  END,
  star_multiplier_applied = false,
  is_star_team = false
WHERE user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
  AND team_id = '134188'
  AND round_id IN (
    SELECT round_id FROM fantasy_round_star_teams 
    WHERE user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
      AND star_team_id = '134188'
  );

-- Now apply star multiplier (2x) for matches AFTER Friday morning 09:00
UPDATE fantasy_team_match_breakdown
SET 
  points_earned = points_earned * 2,
  star_multiplier_applied = true,
  is_star_team = true
WHERE user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
  AND team_id = '134188'
  AND match_date >= '2026-01-17 09:00:00+00'
  AND round_id IN (
    SELECT round_id FROM fantasy_round_star_teams 
    WHERE user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
      AND star_team_id = '134188'
  );

-- Update the fantasy_round_scores for Johnny Speeds in the Weekly Pro Paid round
UPDATE fantasy_round_scores frs
SET current_score = (
  SELECT COALESCE(SUM(points_earned), 0)
  FROM fantasy_team_match_breakdown ftmb
  WHERE ftmb.user_id = frs.user_id
    AND ftmb.round_id = frs.round_id
    AND ftmb.team_id = frs.team_id
)
WHERE user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
  AND team_id = '134188';

-- Update total scores in fantasy_round_picks for affected rounds
UPDATE fantasy_round_picks frp
SET total_score = (
  SELECT COALESCE(SUM(current_score), 0)
  FROM fantasy_round_scores frs
  WHERE frs.user_id = frp.user_id
    AND frs.round_id = frp.round_id
)
WHERE user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
  AND round_id IN (
    SELECT round_id FROM fantasy_round_star_teams 
    WHERE user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
      AND star_team_id = '134188'
  );