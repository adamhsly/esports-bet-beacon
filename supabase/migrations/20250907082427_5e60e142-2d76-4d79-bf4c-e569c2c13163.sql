-- Create premium receipts table to track payments
CREATE TABLE public.premium_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_total INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_session_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row-Level Security
ALTER TABLE public.premium_receipts ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own receipts
CREATE POLICY "Users can view their own receipts" ON public.premium_receipts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policies for edge functions to insert receipts (service role)
CREATE POLICY "Service role can insert receipts" ON public.premium_receipts
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_premium_receipts_user_id ON public.premium_receipts(user_id);
CREATE INDEX idx_premium_receipts_stripe_session ON public.premium_receipts(stripe_session_id);