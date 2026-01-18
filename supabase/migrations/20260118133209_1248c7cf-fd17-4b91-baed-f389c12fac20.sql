-- Fix Soldierce's star team multiplier for previous star teams (manually apply doubled points)
-- This corrects the scores that were overwritten by the automated recalculation

-- 1. ZennIT (132494) in Weekly Pro Paid (71c1619b-cadb-4bb1-800b-c8bc75ba5cff)
-- All matches before star_changed_at should have star multiplier applied

-- Update match breakdowns to double points and mark star_multiplier_applied
UPDATE fantasy_team_match_breakdown
SET 
  points_earned = points_earned * 2,
  star_multiplier_applied = true,
  is_star_team = true,
  updated_at = now()
WHERE round_id = '71c1619b-cadb-4bb1-800b-c8bc75ba5cff'
  AND user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
  AND team_id = '132494'
  AND star_multiplier_applied = false;

-- Update ZennIT team score (39 -> 78)
UPDATE fantasy_round_scores
SET 
  current_score = 78,
  last_updated = now()
WHERE round_id = '71c1619b-cadb-4bb1-800b-c8bc75ba5cff'
  AND user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
  AND team_id = '132494';

-- Update total score for Weekly Pro Paid pick (+39 points)
UPDATE fantasy_round_picks
SET 
  total_score = total_score + 39,
  updated_at = now()
WHERE round_id = '71c1619b-cadb-4bb1-800b-c8bc75ba5cff'
  AND user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3';

-- 2. BIG Academy (126694) in Daily Pro Free (7bd27aa5-6bdd-4a44-91fe-04cdbf2eceaa)
-- All matches before star_changed_at should have star multiplier applied

-- Update match breakdowns to double points and mark star_multiplier_applied
UPDATE fantasy_team_match_breakdown
SET 
  points_earned = points_earned * 2,
  star_multiplier_applied = true,
  is_star_team = true,
  updated_at = now()
WHERE round_id = '7bd27aa5-6bdd-4a44-91fe-04cdbf2eceaa'
  AND user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
  AND team_id = '126694'
  AND star_multiplier_applied = false;

-- Update BIG Academy team score (current 3 -> should be sum of doubled matches)
-- Matches: 3*2=6, 13*2=26, 21*2=42 = 74 total
UPDATE fantasy_round_scores
SET 
  current_score = 74,
  last_updated = now()
WHERE round_id = '7bd27aa5-6bdd-4a44-91fe-04cdbf2eceaa'
  AND user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
  AND team_id = '126694';

-- Update total score for Daily Pro Free pick
-- Current total: 53, BIG Academy was 3, now 74, so add 71 (74-3)
UPDATE fantasy_round_picks
SET 
  total_score = total_score + 71,
  updated_at = now()
WHERE round_id = '7bd27aa5-6bdd-4a44-91fe-04cdbf2eceaa'
  AND user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3';