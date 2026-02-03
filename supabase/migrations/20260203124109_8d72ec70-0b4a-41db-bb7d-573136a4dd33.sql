
-- Fix get_position_change to get the PREVIOUS snapshot (skip the most recent one)
-- The most recent snapshot is the current state, we want to compare against the one before that
CREATE OR REPLACE FUNCTION public.get_position_change(
  p_user_id UUID,
  p_round_id UUID,
  p_current_position INTEGER,
  p_snapshot_type TEXT DEFAULT 'round'
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_previous_position INTEGER;
BEGIN
  -- Get the second most recent snapshot (skip the current/most recent one)
  -- We skip 1 and take the next one to get the previous position
  SELECT position INTO v_previous_position
  FROM leaderboard_position_snapshots
  WHERE user_id = p_user_id
    AND round_id = p_round_id
    AND snapshot_type = p_snapshot_type
  ORDER BY snapshot_at DESC
  OFFSET 1  -- Skip the most recent (current) snapshot
  LIMIT 1;

  -- If no previous position exists, return NULL (no change data yet)
  IF v_previous_position IS NULL THEN
    RETURN NULL;
  END IF;

  -- Return the change (positive = moved up, negative = moved down)
  RETURN v_previous_position - p_current_position;
END;
$$;
