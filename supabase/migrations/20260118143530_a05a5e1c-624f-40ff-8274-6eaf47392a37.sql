-- Update star_changed_at to Friday morning (Jan 17, 2026 at 09:00 UTC)
UPDATE fantasy_round_star_teams
SET star_changed_at = '2026-01-17 09:00:00+00'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'soldierce@gmail.com')
  AND round_id = '5c23b4cc-17f8-49f8-8ca4-bd09bb0691ba';

-- Now recalculate Johnny Speeds matches - apply star multiplier to matches AFTER the star change
-- Johnny Speeds team_id is 132430

-- First, let's see what the base points should be and double them for matches after star change
UPDATE fantasy_team_match_breakdown
SET 
  points_earned = CASE 
    WHEN match_date >= '2026-01-17 09:00:00+00' THEN points_earned * 2 / (CASE WHEN star_multiplier_applied THEN 2 ELSE 1 END)
    ELSE points_earned / (CASE WHEN star_multiplier_applied THEN 2 ELSE 1 END)
  END,
  star_multiplier_applied = (match_date >= '2026-01-17 09:00:00+00'),
  is_star_team = (match_date >= '2026-01-17 09:00:00+00')
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'soldierce@gmail.com')
  AND round_id = '5c23b4cc-17f8-49f8-8ca4-bd09bb0691ba'
  AND team_id = '132430';

-- Update the fantasy_round_scores for Johnny Speeds
UPDATE fantasy_round_scores
SET current_score = (
  SELECT COALESCE(SUM(points_earned), 0)
  FROM fantasy_team_match_breakdown
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'soldierce@gmail.com')
    AND round_id = '5c23b4cc-17f8-49f8-8ca4-bd09bb0691ba'
    AND team_id = '132430'
)
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'soldierce@gmail.com')
  AND round_id = '5c23b4cc-17f8-49f8-8ca4-bd09bb0691ba'
  AND team_id = '132430';

-- Update the total score in fantasy_round_picks
UPDATE fantasy_round_picks
SET total_score = (
  SELECT COALESCE(SUM(current_score), 0)
  FROM fantasy_round_scores
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'soldierce@gmail.com')
    AND round_id = '5c23b4cc-17f8-49f8-8ca4-bd09bb0691ba'
)
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'soldierce@gmail.com')
  AND round_id = '5c23b4cc-17f8-49f8-8ca4-bd09bb0691ba';