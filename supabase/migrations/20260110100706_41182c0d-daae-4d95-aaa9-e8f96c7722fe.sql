-- Update all tier 1 users with promo balance > 250 to have exactly 250 pence
UPDATE profiles
SET promo_balance_pence = 250
WHERE welcome_offer_tier = 1 
  AND welcome_offer_claimed = true
  AND promo_balance_pence > 250;