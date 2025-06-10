
-- Add scheduled_at column to faceit_matches table to store the scheduled start time
ALTER TABLE public.faceit_matches 
ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance on scheduled_at queries
CREATE INDEX idx_faceit_matches_scheduled_at ON public.faceit_matches(scheduled_at);
