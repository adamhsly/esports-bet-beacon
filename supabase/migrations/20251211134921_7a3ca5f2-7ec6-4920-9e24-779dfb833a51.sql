-- Add promo_used column to round_entries table to track promo balance usage
ALTER TABLE public.round_entries 
ADD COLUMN IF NOT EXISTS promo_used INTEGER DEFAULT 0;