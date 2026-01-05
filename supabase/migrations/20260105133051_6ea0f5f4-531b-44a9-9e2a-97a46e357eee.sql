
-- Fix the Jan 5 round status (it opened incorrectly with only 11/35 reservations)
-- Set to finished since cancelled is not an allowed status
UPDATE fantasy_rounds 
SET status = 'finished', updated_at = now()
WHERE id = 'f100d98a-8944-4da3-9133-9ca3b86f35ca';

-- Move reservations from Jan 5 round to Jan 12 round
INSERT INTO round_reservations (round_id, user_id)
SELECT '71c1619b-cadb-4bb1-800b-c8bc75ba5cff', user_id
FROM round_reservations
WHERE round_id = 'f100d98a-8944-4da3-9133-9ca3b86f35ca'
ON CONFLICT (round_id, user_id) DO NOTHING;

-- Delete old reservations from the cancelled round
DELETE FROM round_reservations
WHERE round_id = 'f100d98a-8944-4da3-9133-9ca3b86f35ca';
