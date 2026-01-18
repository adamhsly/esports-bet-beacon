
-- Update the free round star team record to reflect the change from ZennIT to Johnny Speeds on Friday morning
UPDATE fantasy_round_star_teams
SET previous_star_team_id = '132494',
    star_changed_at = '2026-01-16 09:00:00+00',
    change_used = true,
    updated_at = now()
WHERE user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
  AND round_id = 'fedddaf4-84bb-4c5e-ae6a-634a4038fc45'
  AND star_team_id = '134188';

-- ZennIT was star team before the change, so apply star multiplier to their matches before Jan 16 09:00
UPDATE fantasy_team_match_breakdown
SET points_earned = points_earned * 2,
    is_star_team = true,
    star_multiplier_applied = true
WHERE user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
  AND team_id = '132494'
  AND round_id = 'fedddaf4-84bb-4c5e-ae6a-634a4038fc45'
  AND match_date < '2026-01-16 09:00:00+00'
  AND star_multiplier_applied = false;

-- Update ZennIT's fantasy_round_scores
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
  AND team_id = '132494'
  AND round_id = 'fedddaf4-84bb-4c5e-ae6a-634a4038fc45';

-- Update the total_score in fantasy_round_picks for the free round
UPDATE fantasy_round_picks
SET total_score = (
  SELECT COALESCE(SUM(current_score), 0)
  FROM fantasy_round_scores
  WHERE fantasy_round_scores.user_id = fantasy_round_picks.user_id
    AND fantasy_round_scores.round_id = fantasy_round_picks.round_id
),
updated_at = now()
WHERE user_id = '2f882608-aa30-45f4-85d9-d12d7cee89d3'
  AND round_id = 'fedddaf4-84bb-4c5e-ae6a-634a4038fc45';
