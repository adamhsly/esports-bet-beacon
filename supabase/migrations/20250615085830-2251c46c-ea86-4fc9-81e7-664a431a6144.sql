
-- Add raw_response column to store complete match data from FACEIT API
ALTER TABLE public.faceit_player_match_history 
ADD COLUMN IF NOT EXISTS raw_response jsonb;

-- Add comment to document the purpose of this column
COMMENT ON COLUMN public.faceit_player_match_history.raw_response IS 'Complete raw match response from FACEIT API containing all available match data';
