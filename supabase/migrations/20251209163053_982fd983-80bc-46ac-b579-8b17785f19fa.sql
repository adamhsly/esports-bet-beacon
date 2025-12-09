-- Update today's round names to use the new format with " - " separator
UPDATE fantasy_rounds 
SET round_name = REPLACE(round_name, 'Pro Paid', 'Pro - Paid')
WHERE round_name LIKE '%Pro Paid%';

UPDATE fantasy_rounds 
SET round_name = REPLACE(round_name, 'Pro Free', 'Pro - Free')
WHERE round_name LIKE '%Pro Free%';

UPDATE fantasy_rounds 
SET round_name = REPLACE(round_name, 'Amateur Paid', 'Amateur - Paid')
WHERE round_name LIKE '%Amateur Paid%';

UPDATE fantasy_rounds 
SET round_name = REPLACE(round_name, 'Amateur Free', 'Amateur - Free')
WHERE round_name LIKE '%Amateur Free%';

UPDATE fantasy_rounds 
SET round_name = REPLACE(round_name, 'Mixed Paid', 'Mixed - Paid')
WHERE round_name LIKE '%Mixed Paid%';

UPDATE fantasy_rounds 
SET round_name = REPLACE(round_name, 'Mixed Free', 'Mixed - Free')
WHERE round_name LIKE '%Mixed Free%';