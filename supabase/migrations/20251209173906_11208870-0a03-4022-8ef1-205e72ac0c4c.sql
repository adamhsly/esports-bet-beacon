-- Update existing scheduled weekly paid rounds with the Stripe price ID
UPDATE fantasy_rounds 
SET stripe_price_id = 'price_1ScUosFkrjLxsbmbcAWqGN6U'
WHERE type = 'weekly' 
  AND is_paid = true 
  AND status = 'scheduled';