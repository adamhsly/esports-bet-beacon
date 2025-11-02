-- Create fantasy_round_winners table
CREATE TABLE fantasy_round_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES fantasy_rounds(id),
  user_id UUID NOT NULL,
  finish_position INTEGER NOT NULL CHECK (finish_position >= 1 AND finish_position <= 3),
  total_score INTEGER NOT NULL,
  credits_awarded INTEGER NOT NULL,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_viewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(round_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_fantasy_round_winners_user ON fantasy_round_winners(user_id);
CREATE INDEX idx_fantasy_round_winners_round ON fantasy_round_winners(round_id);
CREATE INDEX idx_fantasy_round_winners_unviewed ON fantasy_round_winners(user_id, notification_viewed) WHERE notification_viewed = false;

-- Enable RLS
ALTER TABLE fantasy_round_winners ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own winner records
CREATE POLICY "Users can view own winner records"
ON fantasy_round_winners FOR SELECT
USING (auth.uid() = user_id);

-- RPC Function to award round winners
CREATE OR REPLACE FUNCTION award_round_winners(p_round_id UUID)
RETURNS TABLE(
  user_id UUID,
  finish_position INTEGER,
  total_score INTEGER,
  credits_awarded INTEGER,
  user_email TEXT,
  username TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner RECORD;
  v_position INTEGER := 0;
  v_credits INTEGER;
BEGIN
  -- Get top 3 finishers from the round
  FOR v_winner IN
    SELECT 
      frp.user_id,
      frp.total_score,
      au.email,
      COALESCE(p.username, p.full_name, 'Player') as username
    FROM fantasy_round_picks frp
    LEFT JOIN profiles p ON p.id = frp.user_id
    LEFT JOIN auth.users au ON au.id = frp.user_id
    WHERE frp.round_id = p_round_id
    ORDER BY frp.total_score DESC
    LIMIT 3
  LOOP
    v_position := v_position + 1;
    
    -- Determine credits based on position
    v_credits := CASE v_position
      WHEN 1 THEN 200
      WHEN 2 THEN 100
      WHEN 3 THEN 50
      ELSE 0
    END;
    
    -- Skip if already awarded (idempotency)
    IF EXISTS (
      SELECT 1 FROM fantasy_round_winners 
      WHERE round_id = p_round_id AND user_id = v_winner.user_id
    ) THEN
      CONTINUE;
    END IF;
    
    -- Grant bonus credits
    PERFORM grant_bonus_credits(
      v_winner.user_id,
      v_credits,
      'round_winner'
    );
    
    -- Record the win
    INSERT INTO fantasy_round_winners (
      round_id,
      user_id,
      finish_position,
      total_score,
      credits_awarded
    ) VALUES (
      p_round_id,
      v_winner.user_id,
      v_position,
      v_winner.total_score,
      v_credits
    );
    
    -- Return data for email notifications
    RETURN QUERY SELECT 
      v_winner.user_id,
      v_position,
      v_winner.total_score,
      v_credits,
      v_winner.email,
      v_winner.username;
  END LOOP;
END;
$$;