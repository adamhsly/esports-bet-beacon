-- Table to track user promotional balance (real money value for paid entries)
CREATE TABLE public.user_promo_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_pence INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'welcome_offer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT positive_balance CHECK (balance_pence >= 0)
);

-- Table to track cumulative Stripe spending for welcome offer threshold
CREATE TABLE public.user_welcome_spending (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_spent_pence INTEGER NOT NULL DEFAULT 0,
  offer_claimed BOOLEAN NOT NULL DEFAULT false,
  offer_claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_promo_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_welcome_spending ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only see their own data
CREATE POLICY "Users can view their own promo balance"
ON public.user_promo_balance FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own welcome spending"
ON public.user_welcome_spending FOR SELECT
USING (auth.uid() = user_id);

-- Function to get welcome offer status for a user
CREATE OR REPLACE FUNCTION public.get_welcome_offer_status(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_spending RECORD;
  v_promo_balance INTEGER := 0;
  v_promo_expires TIMESTAMPTZ;
  v_threshold_pence INTEGER := 500; -- £5
  v_reward_pence INTEGER := 1000; -- £10
BEGIN
  -- Get spending record
  SELECT * INTO v_spending
  FROM user_welcome_spending
  WHERE user_id = p_user_id;

  -- Get active (non-expired) promo balance
  SELECT COALESCE(SUM(balance_pence), 0), MAX(expires_at)
  INTO v_promo_balance, v_promo_expires
  FROM user_promo_balance
  WHERE user_id = p_user_id
    AND expires_at > now()
    AND balance_pence > 0;

  RETURN jsonb_build_object(
    'total_spent_pence', COALESCE(v_spending.total_spent_pence, 0),
    'threshold_pence', v_threshold_pence,
    'offer_claimed', COALESCE(v_spending.offer_claimed, false),
    'promo_balance_pence', v_promo_balance,
    'promo_expires_at', v_promo_expires,
    'reward_pence', v_reward_pence
  );
END;
$$;

-- Function to deduct from promo balance
CREATE OR REPLACE FUNCTION public.deduct_promo_balance(p_user_id UUID, p_amount_pence INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_remaining INTEGER := p_amount_pence;
  v_promo RECORD;
  v_deducted INTEGER := 0;
BEGIN
  -- Deduct from oldest non-expired balances first
  FOR v_promo IN
    SELECT id, balance_pence
    FROM user_promo_balance
    WHERE user_id = p_user_id
      AND expires_at > now()
      AND balance_pence > 0
    ORDER BY expires_at ASC
    FOR UPDATE
  LOOP
    IF v_remaining <= 0 THEN
      EXIT;
    END IF;

    IF v_promo.balance_pence >= v_remaining THEN
      UPDATE user_promo_balance
      SET balance_pence = balance_pence - v_remaining
      WHERE id = v_promo.id;
      v_deducted := v_deducted + v_remaining;
      v_remaining := 0;
    ELSE
      v_deducted := v_deducted + v_promo.balance_pence;
      v_remaining := v_remaining - v_promo.balance_pence;
      UPDATE user_promo_balance
      SET balance_pence = 0
      WHERE id = v_promo.id;
    END IF;
  END LOOP;

  RETURN v_deducted;
END;
$$;

-- Function to award welcome offer (called by webhook)
CREATE OR REPLACE FUNCTION public.award_welcome_offer(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_spending RECORD;
BEGIN
  -- Get or create spending record
  INSERT INTO user_welcome_spending (user_id, total_spent_pence)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_spending
  FROM user_welcome_spending
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if already claimed
  IF v_spending.offer_claimed THEN
    RETURN false;
  END IF;

  -- Check threshold
  IF v_spending.total_spent_pence < 500 THEN
    RETURN false;
  END IF;

  -- Award the promo balance (£10 = 1000 pence, expires in 7 days)
  INSERT INTO user_promo_balance (user_id, balance_pence, source, expires_at)
  VALUES (p_user_id, 1000, 'welcome_offer', now() + interval '7 days');

  -- Mark offer as claimed
  UPDATE user_welcome_spending
  SET offer_claimed = true, offer_claimed_at = now(), updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$;

-- Indexes for performance
CREATE INDEX idx_user_promo_balance_user_expires ON public.user_promo_balance(user_id, expires_at) WHERE balance_pence > 0;
CREATE INDEX idx_user_welcome_spending_user ON public.user_welcome_spending(user_id);