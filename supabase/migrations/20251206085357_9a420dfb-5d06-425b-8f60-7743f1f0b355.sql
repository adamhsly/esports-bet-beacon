-- Add prize configuration and section fields to fantasy_rounds
ALTER TABLE public.fantasy_rounds
ADD COLUMN IF NOT EXISTS prize_type text DEFAULT 'credits' CHECK (prize_type IN ('credits', 'vouchers')),
ADD COLUMN IF NOT EXISTS prize_1st integer DEFAULT 200,
ADD COLUMN IF NOT EXISTS prize_2nd integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS prize_3rd integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS section_name text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.fantasy_rounds.prize_type IS 'Type of prize: credits or vouchers';
COMMENT ON COLUMN public.fantasy_rounds.prize_1st IS 'Prize amount for 1st place (credits or pence for vouchers)';
COMMENT ON COLUMN public.fantasy_rounds.prize_2nd IS 'Prize amount for 2nd place';
COMMENT ON COLUMN public.fantasy_rounds.prize_3rd IS 'Prize amount for 3rd place';
COMMENT ON COLUMN public.fantasy_rounds.section_name IS 'Display section name in round selector (e.g., "Win Vouchers", "Free Rounds")';