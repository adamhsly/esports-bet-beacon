-- Reset user 1danne1 (correct ID) to Tier 1 welcome offer
UPDATE profiles
SET 
  welcome_offer_tier = 1,
  promo_balance_pence = 250,
  welcome_offer_claimed = false
WHERE id = '06f2afbc-b1ec-4f0a-bfeb-226f7af7ba1a';