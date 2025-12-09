-- Update section_name values to use " - " separator
UPDATE fantasy_rounds 
SET section_name = REPLACE(section_name, 'Quick Fire Paid', 'Quick Fire - Paid')
WHERE section_name = 'Quick Fire Paid';

UPDATE fantasy_rounds 
SET section_name = REPLACE(section_name, 'Quick Fire Free', 'Quick Fire - Free')
WHERE section_name = 'Quick Fire Free';

UPDATE fantasy_rounds 
SET section_name = REPLACE(section_name, 'Weekly Fun Paid', 'Weekly Fun - Paid')
WHERE section_name = 'Weekly Fun Paid';

UPDATE fantasy_rounds 
SET section_name = REPLACE(section_name, 'Weekly Fun Free', 'Weekly Fun - Free')
WHERE section_name = 'Weekly Fun Free';

UPDATE fantasy_rounds 
SET section_name = REPLACE(section_name, 'Monthly Grind Paid', 'Monthly Grind - Paid')
WHERE section_name = 'Monthly Grind Paid';

UPDATE fantasy_rounds 
SET section_name = REPLACE(section_name, 'Monthly Grind Free', 'Monthly Grind - Free')
WHERE section_name = 'Monthly Grind Free';