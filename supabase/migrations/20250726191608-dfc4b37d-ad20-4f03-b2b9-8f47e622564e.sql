-- Add 'scheduled' as a valid status for fantasy rounds
ALTER TABLE fantasy_rounds 
DROP CONSTRAINT fantasy_rounds_status_check;

ALTER TABLE fantasy_rounds 
ADD CONSTRAINT fantasy_rounds_status_check 
CHECK (status IN ('open', 'scheduled', 'active', 'finished', 'closed'));

-- Now fix the tomorrow's round to be scheduled instead of open
UPDATE fantasy_rounds 
SET status = 'scheduled' 
WHERE start_date = '2025-07-27T09:00:00.000Z' 
  AND type = 'daily' 
  AND status = 'open';