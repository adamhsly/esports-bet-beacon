-- Add missing columns for welcome offer promo balance
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS promo_balance_pence integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS promo_expires_at timestamp with time zone DEFAULT NULL;