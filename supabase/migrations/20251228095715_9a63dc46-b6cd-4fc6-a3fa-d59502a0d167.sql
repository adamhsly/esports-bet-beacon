-- Create table to track consolation prizes
CREATE TABLE public.fantasy_round_consolations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES fantasy_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  finish_position INTEGER,
  total_score INTEGER,
  credits_awarded INTEGER NOT NULL DEFAULT 10,
  notification_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(round_id, user_id)
);

-- Enable RLS
ALTER TABLE public.fantasy_round_consolations ENABLE ROW LEVEL SECURITY;

-- Users can view their own consolation records
CREATE POLICY "Users can view own consolation records"
ON public.fantasy_round_consolations
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all consolations"
ON public.fantasy_round_consolations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for faster lookups
CREATE INDEX idx_consolations_round_user ON public.fantasy_round_consolations(round_id, user_id);
CREATE INDEX idx_consolations_user ON public.fantasy_round_consolations(user_id);