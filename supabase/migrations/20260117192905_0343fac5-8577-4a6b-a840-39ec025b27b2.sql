-- Manual correction: Double points for Soldierce's previous star teams

-- 1. Update ZennIT match breakdowns for Weekly Pro Paid round (round_id: 71c1619b-cadb-4bb1-800b-c8bc75ba5cff)
UPDATE fantasy_team_match_breakdown
SET 
  points_earned = points_earned * 2,
  star_multiplier_applied = true,
  is_star_team = true,
  updated_at = now()
WHERE round_id = '71c1619b-cadb-4bb1-800b-c8bc75ba5cff'
  AND user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
  AND team_id = '132494';

-- 2. Update ZennIT team score
UPDATE fantasy_round_scores
SET 
  current_score = current_score * 2,
  last_updated = now()
WHERE round_id = '71c1619b-cadb-4bb1-800b-c8bc75ba5cff'
  AND user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
  AND team_id = '132494';

-- 3. Update BIG Academy match breakdowns for Daily Pro Free round (round_id: 7bd27aa5-6bdd-4a44-91fe-04cdbf2eceaa)
UPDATE fantasy_team_match_breakdown
SET 
  points_earned = points_earned * 2,
  star_multiplier_applied = true,
  is_star_team = true,
  updated_at = now()
WHERE round_id = '7bd27aa5-6bdd-4a44-91fe-04cdbf2eceaa'
  AND user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
  AND team_id = '126694';

-- 4. Update BIG Academy team score
UPDATE fantasy_round_scores
SET 
  current_score = current_score * 2,
  last_updated = now()
WHERE round_id = '7bd27aa5-6bdd-4a44-91fe-04cdbf2eceaa'
  AND user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
  AND team_id = '126694';

-- 5. Update total scores on fantasy_round_picks
-- Weekly Pro Paid: Add 39 points (the doubled portion)
UPDATE fantasy_round_picks
SET 
  total_score = total_score + 39,
  updated_at = now()
WHERE round_id = '71c1619b-cadb-4bb1-800b-c8bc75ba5cff'
  AND user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3';

-- Daily Pro Free: Add 3 points (the doubled portion)
UPDATE fantasy_round_picks
SET 
  total_score = total_score + 3,
  updated_at = now()
WHERE round_id = '7bd27aa5-6bdd-4a44-91fe-04cdbf2eceaa'
  AND user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3';

-- 6. Update the star team records to reflect the previous star teams
UPDATE fantasy_round_star_teams
SET 
  previous_star_team_id = '132494',  -- ZennIT
  star_changed_at = now(),
  updated_at = now()
WHERE round_id = '71c1619b-cadb-4bb1-800b-c8bc75ba5cff'
  AND user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3';

UPDATE fantasy_round_star_teams
SET 
  previous_star_team_id = '126694',  -- BIG Academy
  star_changed_at = now(),
  updated_at = now()
WHERE round_id = '7bd27aa5-6bdd-4a44-91fe-04cdbf2eceaa'
  AND user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3';