-- Enable RLS on round_credit_spend table to protect user spending data

ALTER TABLE public.round_credit_spend ENABLE ROW LEVEL SECURITY;

-- Users can view their own spending records
CREATE POLICY "Users can view own credit spending"
  ON public.round_credit_spend
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only service role can insert/update spending records to prevent manipulation
CREATE POLICY "Service role can manage credit spending"
  ON public.round_credit_spend
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);