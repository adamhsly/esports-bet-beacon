-- Fix the Jan 12 weekly paid round to have correct prizes (£85 total)
UPDATE fantasy_rounds 
SET prize_1st = 5000, prize_2nd = 2500, prize_3rd = 1000
WHERE id = '71c1619b-cadb-4bb1-800b-c8bc75ba5cff';