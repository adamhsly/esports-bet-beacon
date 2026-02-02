-- Fix the Weekly Pro - Paid - Week of Feb 2 round status (was incorrectly set to 'finished')
UPDATE fantasy_rounds 
SET status = 'open', updated_at = now()
WHERE id = 'fd1c8cc4-ad0b-4503-864d-771996d8dbb3';