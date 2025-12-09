-- Update existing scheduled daily paid rounds with the Stripe price ID
UPDATE fantasy_rounds 
SET stripe_price_id = 'price_1ScUb9FkrjLxsbmbtJ2Iw0I1'
WHERE type = 'daily' 
  AND is_paid = true 
  AND status = 'scheduled';