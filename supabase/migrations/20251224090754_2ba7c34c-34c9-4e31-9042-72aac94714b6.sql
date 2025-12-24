-- Drop the existing check constraint and add a new one that includes 'promo'
ALTER TABLE public.currency_kinds DROP CONSTRAINT currency_kinds_kind_check;
ALTER TABLE public.currency_kinds ADD CONSTRAINT currency_kinds_kind_check CHECK (kind IN ('fantasy', 'promo'));

-- Add 'promo' to currency_kinds table for welcome offer promo balance
INSERT INTO public.currency_kinds (kind) 
VALUES ('promo')
ON CONFLICT (kind) DO NOTHING;