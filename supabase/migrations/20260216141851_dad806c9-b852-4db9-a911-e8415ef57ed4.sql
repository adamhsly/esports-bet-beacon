
-- Fix Soldierce's promo balance: should have £5.00 (500 pence) remaining
UPDATE profiles 
SET promo_balance_pence = 500, 
    updated_at = now() 
WHERE id = '2f882608-aa30-45f4-85d9-d12d7cee89d3';
