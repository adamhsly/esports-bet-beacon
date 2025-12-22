-- Fix cancelled matches that have a winner (they actually finished)
UPDATE pandascore_matches 
SET status = 'finished', updated_at = now() 
WHERE status = 'cancelled' 
AND winner_id IS NOT NULL;