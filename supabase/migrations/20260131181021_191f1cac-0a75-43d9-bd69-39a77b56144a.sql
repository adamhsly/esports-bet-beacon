-- Fix existing cancelled matches that have a winner_id (these should be marked as finished)
UPDATE public.pandascore_matches
SET status = 'finished', 
    updated_at = now()
WHERE status = 'cancelled' 
  AND winner_id IS NOT NULL;