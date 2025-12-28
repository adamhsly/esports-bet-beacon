
-- Add composite index for better performance on team stats queries
CREATE INDEX IF NOT EXISTS idx_faceit_matches_date_status_finished 
ON public.faceit_matches (match_date, status) 
WHERE status = 'finished';
