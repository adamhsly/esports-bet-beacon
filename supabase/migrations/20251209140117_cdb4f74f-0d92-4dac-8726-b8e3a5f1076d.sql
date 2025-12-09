-- Fix prize values for existing Daily Paid rounds (Dec 10)
-- Convert from whole numbers to pennies for voucher prizes
UPDATE fantasy_rounds 
SET prize_1st = 2500, prize_2nd = 1000, prize_3rd = 400
WHERE id IN (
  '5ebe398d-2731-4abd-a410-3b3eccbbb7f9',
  '20794292-f3c2-4773-8f37-212e44839202'
);