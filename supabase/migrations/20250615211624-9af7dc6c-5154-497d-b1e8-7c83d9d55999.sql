
-- Add a new column to the faceit_matches table to store the championship stream URL
ALTER TABLE faceit_matches
ADD COLUMN championship_stream_url text;
