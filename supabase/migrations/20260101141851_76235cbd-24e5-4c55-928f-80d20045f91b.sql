-- Delete fantasy round picks for "Weekly Pro - Paid - Week of Jan 5"
DELETE FROM fantasy_round_picks WHERE round_id = 'f100d98a-8944-4da3-9133-9ca3b86f35ca';

-- Delete round entries for this round
DELETE FROM round_entries WHERE round_id = 'f100d98a-8944-4da3-9133-9ca3b86f35ca';

-- Delete reservations for this round
DELETE FROM round_reservations WHERE round_id = 'f100d98a-8944-4da3-9133-9ca3b86f35ca';

-- Reset the round status back to scheduled and ensure threshold is 35
UPDATE fantasy_rounds 
SET status = 'scheduled', minimum_reservations = 35
WHERE id = 'f100d98a-8944-4da3-9133-9ca3b86f35ca';