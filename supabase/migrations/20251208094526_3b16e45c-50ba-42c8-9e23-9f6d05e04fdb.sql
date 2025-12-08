-- Drop the unique constraint to allow multiple entries per user per round
ALTER TABLE public.fantasy_round_picks 
DROP CONSTRAINT fantasy_round_picks_user_id_round_id_key;