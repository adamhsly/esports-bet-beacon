-- Update promo balance to £10 (1000 pence)
UPDATE public.profiles 
SET promo_balance_pence = 1000,
    promo_expires_at = NOW() + INTERVAL '30 days'
WHERE id = '6e5daafa-93aa-4a91-85f9-a86adcc77ad3';

-- Record the credit transaction
INSERT INTO public.credit_transactions (user_id, kind, delta, reason)
VALUES ('6e5daafa-93aa-4a91-85f9-a86adcc77ad3', 'promo', 1000, 'Manual promo credit - admin grant');