-- Delete test user picks from paid round "Weekly Pro - Paid - Week of Jan 5"
DELETE FROM fantasy_round_picks 
WHERE round_id = 'f100d98a-8944-4da3-9133-9ca3b86f35ca'
AND user_id IN (SELECT id FROM profiles WHERE test = true);