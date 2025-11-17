-- Update the fantasy_rounds type check constraint to allow 'private' type
ALTER TABLE public.fantasy_rounds
DROP CONSTRAINT fantasy_rounds_type_check;

ALTER TABLE public.fantasy_rounds
ADD CONSTRAINT fantasy_rounds_type_check 
CHECK (type = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text, 'private'::text]));