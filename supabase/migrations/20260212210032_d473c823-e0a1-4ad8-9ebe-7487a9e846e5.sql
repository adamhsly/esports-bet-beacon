-- Fix 1danne1's welcome_offer_claimed flag (they already used tier 2 promo)
UPDATE profiles 
SET welcome_offer_claimed = true 
WHERE id = '06f2afbc-b1ec-4f0a-bfeb-226f7af7ba1a' 
AND welcome_offer_claimed = false;