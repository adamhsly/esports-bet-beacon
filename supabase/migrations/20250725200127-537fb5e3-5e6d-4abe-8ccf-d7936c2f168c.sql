-- Add unique constraint for fantasy_round_scores upsert functionality
ALTER TABLE fantasy_round_scores 
ADD CONSTRAINT fantasy_round_scores_unique_user_team_round 
UNIQUE (round_id, user_id, team_id);

-- Create function to update fantasy round status when they end
CREATE OR REPLACE FUNCTION update_expired_fantasy_rounds()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update rounds that have ended to 'finished' status
  UPDATE fantasy_rounds 
  SET status = 'finished', updated_at = now()
  WHERE end_date <= now() 
    AND status IN ('open', 'active');
    
  -- Log the number of rounds updated
  GET DIAGNOSTICS 
    FROM ROW_COUNT;
END;
$$;