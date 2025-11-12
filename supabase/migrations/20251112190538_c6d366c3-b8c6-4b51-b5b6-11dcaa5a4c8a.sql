-- Fix Ultimate manager mission target to 3 (daily, weekly, monthly round types)
UPDATE missions 
SET target = 3,
    description = 'Enter every round type at least once per month (3 months total).'
WHERE code = 's_round_types_each_month';