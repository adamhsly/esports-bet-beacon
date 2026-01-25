
-- Add a column to track if the team summary email has been sent for a round
ALTER TABLE fantasy_rounds 
ADD COLUMN IF NOT EXISTS team_summary_sent boolean DEFAULT false;

-- Update existing finished rounds to mark them as already processed 
-- (so we don't spam old rounds)
UPDATE fantasy_rounds 
SET team_summary_sent = true 
WHERE status = 'finished' 
  AND end_date < NOW() - INTERVAL '1 day';
