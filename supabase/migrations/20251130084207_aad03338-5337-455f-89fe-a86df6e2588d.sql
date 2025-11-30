-- Add paid round columns to fantasy_rounds
ALTER TABLE fantasy_rounds
ADD COLUMN entry_fee INTEGER DEFAULT NULL,
ADD COLUMN is_paid BOOLEAN DEFAULT FALSE;

-- Create round_entries table to track payments
CREATE TABLE round_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES fantasy_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  pick_id UUID REFERENCES fantasy_round_picks(id) ON DELETE SET NULL,
  stripe_session_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  amount_paid INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE round_entries ENABLE ROW LEVEL SECURITY;

-- Users can view their own entries
CREATE POLICY "Users can view their own entries" 
ON round_entries FOR SELECT 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_round_entries_round_user ON round_entries(round_id, user_id);
CREATE INDEX idx_round_entries_stripe_session ON round_entries(stripe_session_id);