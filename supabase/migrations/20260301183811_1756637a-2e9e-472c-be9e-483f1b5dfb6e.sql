-- Fix 51 matches that have winner_id but status is cancelled
UPDATE pandascore_matches 
SET status = 'finished', updated_at = now() 
WHERE start_time >= now() - interval '7 days' AND start_time <= now()
AND status = 'cancelled' AND winner_id IS NOT NULL;

-- Fix 25 matches where raw_data has winner but DB doesn't
UPDATE pandascore_matches 
SET status = 'finished', 
    winner_id = raw_data->>'winner_id', 
    updated_at = now() 
WHERE start_time >= now() - interval '7 days' AND start_time <= now()
AND status = 'cancelled' 
AND winner_id IS NULL
AND raw_data->>'winner_id' IS NOT NULL 
AND raw_data->>'winner_id' != 'null';