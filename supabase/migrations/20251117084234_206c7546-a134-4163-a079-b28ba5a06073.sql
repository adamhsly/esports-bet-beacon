-- Add private round support to fantasy_rounds table
ALTER TABLE public.fantasy_rounds
ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS join_code text,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS max_participants integer,
ADD COLUMN IF NOT EXISTS round_name text;

-- Create unique index on join_code for performance and uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_fantasy_rounds_join_code 
ON public.fantasy_rounds(join_code) 
WHERE join_code IS NOT NULL;

-- Add index on created_by for quick lookups
CREATE INDEX IF NOT EXISTS idx_fantasy_rounds_created_by 
ON public.fantasy_rounds(created_by) 
WHERE created_by IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.fantasy_rounds.is_private IS 'Whether this is a private/invite-only round';
COMMENT ON COLUMN public.fantasy_rounds.join_code IS 'Unique code for joining private rounds';
COMMENT ON COLUMN public.fantasy_rounds.created_by IS 'User who created this private round';
COMMENT ON COLUMN public.fantasy_rounds.round_name IS 'Custom name for private rounds';