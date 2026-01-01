-- Add reminder_type column to welcome_bonus_reminders to track different offer types
ALTER TABLE public.welcome_bonus_reminders 
ADD COLUMN IF NOT EXISTS reminder_type text DEFAULT 'promo_balance';

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_welcome_bonus_reminders_type 
ON public.welcome_bonus_reminders(user_id, reminder_day, reminder_type);