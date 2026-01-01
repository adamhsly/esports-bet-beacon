-- Create round_reservations table for paid round ticket reservations
CREATE TABLE public.round_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.fantasy_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reserved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notified_at TIMESTAMP WITH TIME ZONE,
  rolled_over_from UUID REFERENCES public.round_reservations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(round_id, user_id)
);

-- Add minimum_reservations column to fantasy_rounds if not exists
ALTER TABLE public.fantasy_rounds 
ADD COLUMN IF NOT EXISTS minimum_reservations INTEGER DEFAULT 35;

-- Enable RLS
ALTER TABLE public.round_reservations ENABLE ROW LEVEL SECURITY;

-- Users can view their own reservations
CREATE POLICY "Users can view their own reservations"
ON public.round_reservations
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own reservations
CREATE POLICY "Users can insert their own reservations"
ON public.round_reservations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role can manage all reservations (for edge functions)
CREATE POLICY "Service role can manage all reservations"
ON public.round_reservations
FOR ALL
USING (auth.role() = 'service_role');

-- Create index for faster lookups
CREATE INDEX idx_round_reservations_round_id ON public.round_reservations(round_id);
CREATE INDEX idx_round_reservations_user_id ON public.round_reservations(user_id);