-- Remove legacy/duplicate mission codes that are no longer used
-- These have been replaced by newer codes following the naming pattern (d_*, w_*, etc.)

DELETE FROM public.user_missions 
WHERE mission_id IN (
  SELECT id FROM public.missions 
  WHERE code IN ('daily_amateur1', 'daily_login', 'daily_pick3', 'daily_set_lineup', 'weekly_join3')
);

DELETE FROM public.missions 
WHERE code IN ('daily_amateur1', 'daily_login', 'daily_pick3', 'daily_set_lineup', 'weekly_join3');