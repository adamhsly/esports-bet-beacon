-- Fix Cross-Play Day mission target from 2 to 1
-- The mission completes when user joins both daily and weekly rounds in one day
-- The code increments by 1 when both conditions are met, so target should be 1
UPDATE missions 
SET target = 1 
WHERE code = 'd_play_daily_weekly';