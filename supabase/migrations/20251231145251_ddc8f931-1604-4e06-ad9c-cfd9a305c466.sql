-- Create table to track welcome bonus reminder emails
CREATE TABLE public.welcome_bonus_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_day INTEGER NOT NULL, -- 2 or 5
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, reminder_day)
);

-- Enable RLS
ALTER TABLE public.welcome_bonus_reminders ENABLE ROW LEVEL SECURITY;

-- Only the service role should access this table (no user policies needed)
CREATE POLICY "Service role can manage reminders"
  ON public.welcome_bonus_reminders
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for efficient queries
CREATE INDEX idx_welcome_bonus_reminders_user_id ON public.welcome_bonus_reminders(user_id);