
-- Add column to store raw championship data from FACEIT API
ALTER TABLE faceit_matches 
ADD COLUMN championship_raw_data jsonb;
