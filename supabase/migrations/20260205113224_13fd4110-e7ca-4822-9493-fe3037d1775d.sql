UPDATE fantasy_round_star_teams
SET 
  previous_star_team_id = '133868',
  star_changed_at = '2026-02-04 18:54:10',
  change_used = true
WHERE round_id = 'fd1c8cc4-ad0b-4503-864d-771996d8dbb3'
  AND user_id = (SELECT id FROM profiles WHERE username = '1danne1');