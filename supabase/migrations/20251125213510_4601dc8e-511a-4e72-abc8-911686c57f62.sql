-- Create fantasy_round_team_swaps table
CREATE TABLE IF NOT EXISTS public.fantasy_round_team_swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  round_id UUID NOT NULL REFERENCES public.fantasy_rounds(id) ON DELETE CASCADE,
  old_team_id TEXT NOT NULL,
  new_team_id TEXT NOT NULL,
  swap_used BOOLEAN NOT NULL DEFAULT true,
  swapped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  points_at_swap INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, round_id)
);

-- Enable RLS
ALTER TABLE public.fantasy_round_team_swaps ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own team swaps"
  ON public.fantasy_round_team_swaps
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own team swaps"
  ON public.fantasy_round_team_swaps
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own team swaps"
  ON public.fantasy_round_team_swaps
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Fantasy round team swaps are publicly viewable"
  ON public.fantasy_round_team_swaps
  FOR SELECT
  USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_fantasy_round_team_swaps_user_round 
  ON public.fantasy_round_team_swaps(user_id, round_id);

-- Function to get team swap state
CREATE OR REPLACE FUNCTION public.get_team_swap_state(p_round_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_swap_record RECORD;
  v_round_status TEXT;
BEGIN
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'old_team_id', null,
      'new_team_id', null,
      'swap_used', false,
      'can_swap', false,
      'points_at_swap', 0
    );
  END IF;

  -- Get round status
  SELECT status INTO v_round_status
  FROM fantasy_rounds
  WHERE id = p_round_id;

  -- Get swap record
  SELECT * INTO v_swap_record
  FROM fantasy_round_team_swaps
  WHERE user_id = v_user_id AND round_id = p_round_id;

  -- Determine if user can swap
  -- Can swap if: no swap yet, or round is active and swap not used
  RETURN jsonb_build_object(
    'old_team_id', COALESCE(v_swap_record.old_team_id, null),
    'new_team_id', COALESCE(v_swap_record.new_team_id, null),
    'swap_used', COALESCE(v_swap_record.swap_used, false),
    'can_swap', CASE 
      WHEN v_swap_record.id IS NULL THEN true  -- No swap yet
      WHEN v_round_status = 'active' AND NOT COALESCE(v_swap_record.swap_used, false) THEN true
      ELSE false
    END,
    'points_at_swap', COALESCE(v_swap_record.points_at_swap, 0),
    'swapped_at', v_swap_record.swapped_at
  );
END;
$$;

-- Function to set team swap
CREATE OR REPLACE FUNCTION public.set_team_swap(
  p_round_id UUID,
  p_old_team_id TEXT,
  p_new_team_id TEXT,
  p_points_at_swap INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_swap_record RECORD;
  v_round_status TEXT;
  v_old_team_budget NUMERIC;
  v_new_team_budget NUMERIC;
  v_team_picks JSONB;
  v_updated_picks JSONB;
  v_pick_found BOOLEAN := false;
BEGIN
  -- Check authentication
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get round status
  SELECT status INTO v_round_status
  FROM fantasy_rounds
  WHERE id = p_round_id;

  IF v_round_status NOT IN ('open', 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round is not active');
  END IF;

  -- Check if swap already used
  SELECT * INTO v_swap_record
  FROM fantasy_round_team_swaps
  WHERE user_id = v_user_id AND round_id = p_round_id;

  IF v_swap_record.swap_used THEN
    RETURN jsonb_build_object('success', false, 'error', 'Swap already used for this round');
  END IF;

  -- Get budgets for both teams
  SELECT price INTO v_old_team_budget
  FROM fantasy_team_prices
  WHERE round_id = p_round_id AND team_id = p_old_team_id
  LIMIT 1;

  SELECT price INTO v_new_team_budget
  FROM fantasy_team_prices
  WHERE round_id = p_round_id AND team_id = p_new_team_id
  LIMIT 1;

  -- Validate budget constraint
  IF v_new_team_budget > v_old_team_budget THEN
    RETURN jsonb_build_object('success', false, 'error', 'New team budget exceeds old team budget');
  END IF;

  -- Get user's picks
  SELECT team_picks INTO v_team_picks
  FROM fantasy_round_picks
  WHERE user_id = v_user_id AND round_id = p_round_id;

  IF v_team_picks IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No picks found for this round');
  END IF;

  -- Replace old team with new team in picks
  v_updated_picks := '[]'::jsonb;
  FOR i IN 0..jsonb_array_length(v_team_picks) - 1 LOOP
    IF (v_team_picks->i->>'id') = p_old_team_id THEN
      v_pick_found := true;
      -- Replace with new team, preserving other properties
      v_updated_picks := v_updated_picks || jsonb_build_object(
        'id', p_new_team_id,
        'name', (SELECT team_name FROM fantasy_team_prices WHERE round_id = p_round_id AND team_id = p_new_team_id LIMIT 1),
        'type', v_team_picks->i->>'type',
        'price', v_new_team_budget
      );
    ELSE
      v_updated_picks := v_updated_picks || (v_team_picks->i);
    END IF;
  END LOOP;

  IF NOT v_pick_found THEN
    RETURN jsonb_build_object('success', false, 'error', 'Old team not found in your picks');
  END IF;

  -- Update picks
  UPDATE fantasy_round_picks
  SET team_picks = v_updated_picks,
      updated_at = now()
  WHERE user_id = v_user_id AND round_id = p_round_id;

  -- Insert or update swap record
  INSERT INTO fantasy_round_team_swaps (
    user_id, round_id, old_team_id, new_team_id, swap_used, points_at_swap, swapped_at
  )
  VALUES (
    v_user_id, p_round_id, p_old_team_id, p_new_team_id, true, p_points_at_swap, now()
  )
  ON CONFLICT (user_id, round_id) 
  DO UPDATE SET
    old_team_id = EXCLUDED.old_team_id,
    new_team_id = EXCLUDED.new_team_id,
    swap_used = true,
    points_at_swap = EXCLUDED.points_at_swap,
    swapped_at = now(),
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'old_team_id', p_old_team_id,
    'new_team_id', p_new_team_id,
    'swap_used', true,
    'points_at_swap', p_points_at_swap
  );
END;
$$;