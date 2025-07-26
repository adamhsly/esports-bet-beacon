-- Fix the tomorrow's round to be scheduled instead of open
UPDATE fantasy_rounds 
SET status = 'scheduled' 
WHERE start_date = '2025-07-27T09:00:00.000Z' 
  AND type = 'daily' 
  AND status = 'open';