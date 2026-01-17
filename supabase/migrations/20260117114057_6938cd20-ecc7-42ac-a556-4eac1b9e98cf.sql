-- Add compensation_type column to creator_affiliates
-- 'revenue_share' = current model (20-30% of entry fees)
-- 'pay_per_play' = fixed amount per registration + first round played
ALTER TABLE public.creator_affiliates
ADD COLUMN IF NOT EXISTS compensation_type TEXT NOT NULL DEFAULT 'revenue_share';

-- Add pay_per_play_rate column (amount in cents for pay_per_play scheme)
-- Bronze = $0.50 (50 cents), Silver = $1.00 (100 cents), Gold = $1.50 (150 cents)
ALTER TABLE public.creator_affiliates
ADD COLUMN IF NOT EXISTS pay_per_play_rate INTEGER NOT NULL DEFAULT 50;

-- Add compensation_type to creator_applications so applicants can choose
ALTER TABLE public.creator_applications
ADD COLUMN IF NOT EXISTS preferred_compensation TEXT DEFAULT 'revenue_share';

-- Create a table to track referred user activations (registration + first round played)
-- This is used for the pay_per_play scheme
CREATE TABLE IF NOT EXISTS public.affiliate_activations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creator_affiliates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  first_round_played_at TIMESTAMP WITH TIME ZONE,
  round_id UUID,
  activated BOOLEAN NOT NULL DEFAULT false,
  payout_amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_activations ENABLE ROW LEVEL SECURITY;

-- Policy for admins to manage
CREATE POLICY "Admins can manage affiliate activations"
ON public.affiliate_activations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy for affiliates to view their own activations
CREATE POLICY "Affiliates can view their own activations"
ON public.affiliate_activations
FOR SELECT
USING (
  creator_id IN (
    SELECT id FROM public.creator_affiliates
    WHERE user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_affiliate_activations_creator_id ON public.affiliate_activations(creator_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_activations_user_id ON public.affiliate_activations(user_id);

-- Add comment for documentation
COMMENT ON TABLE public.affiliate_activations IS 'Tracks referred users for pay-per-play affiliates. Activation occurs when user registers AND plays their first round.';
COMMENT ON COLUMN public.creator_affiliates.compensation_type IS 'revenue_share = % of entry fees, pay_per_play = fixed amount per activated user';
COMMENT ON COLUMN public.creator_affiliates.pay_per_play_rate IS 'Amount in cents for pay_per_play scheme. Bronze=50, Silver=100, Gold=150';