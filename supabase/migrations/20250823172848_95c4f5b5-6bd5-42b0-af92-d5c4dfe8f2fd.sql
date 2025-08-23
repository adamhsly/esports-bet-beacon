-- Create table to track star teams for each user/round
CREATE TABLE public.fantasy_round_star_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  round_id UUID NOT NULL,
  star_team_id TEXT NOT NULL,
  change_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, round_id)
);

-- Enable RLS
ALTER TABLE public.fantasy_round_star_teams ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own star teams" 
ON public.fantasy_round_star_teams 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own star teams" 
ON public.fantasy_round_star_teams 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own star teams" 
ON public.fantasy_round_star_teams 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RPC function to set star team with business rules
CREATE OR REPLACE FUNCTION public.set_star_team(p_round_id UUID, p_team_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing RECORD;
  v_round_status TEXT;
  v_change_used BOOLEAN := FALSE;
BEGIN
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if round exists and is active
  SELECT status INTO v_round_status
  FROM fantasy_rounds
  WHERE id = p_round_id;

  IF v_round_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round not found');
  END IF;

  IF v_round_status NOT IN ('open', 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round is not active');
  END IF;

  -- Check if user has picks for this round
  IF NOT EXISTS (
    SELECT 1 FROM fantasy_round_picks 
    WHERE user_id = v_user_id AND round_id = p_round_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No team picks found for this round');
  END IF;

  -- Get existing star team record
  SELECT * INTO v_existing
  FROM fantasy_round_star_teams
  WHERE user_id = v_user_id AND round_id = p_round_id;

  -- If round is active and user already has a star team, mark change as used
  IF v_existing.id IS NOT NULL AND v_round_status = 'active' THEN
    v_change_used := TRUE;
    
    -- Check if they already used their change
    IF v_existing.change_used THEN
      RETURN jsonb_build_object('success', false, 'error', 'Star team change already used this round');
    END IF;
  END IF;

  -- Insert or update star team
  INSERT INTO fantasy_round_star_teams (user_id, round_id, star_team_id, change_used, updated_at)
  VALUES (v_user_id, p_round_id, p_team_id, v_change_used, now())
  ON CONFLICT (user_id, round_id) 
  DO UPDATE SET 
    star_team_id = EXCLUDED.star_team_id,
    change_used = v_change_used,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'star_team_id', p_team_id,
    'change_used', v_change_used
  );
END;
$$;

-- Create function to get star team state
CREATE OR REPLACE FUNCTION public.get_star_team_state(p_round_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_star_record RECORD;
  v_round_status TEXT;
BEGIN
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'star_team_id', null,
      'change_used', false,
      'can_change', false
    );
  END IF;

  -- Get round status
  SELECT status INTO v_round_status
  FROM fantasy_rounds
  WHERE id = p_round_id;

  -- Get star team record
  SELECT * INTO v_star_record
  FROM fantasy_round_star_teams
  WHERE user_id = v_user_id AND round_id = p_round_id;

  -- Determine if user can change
  -- Can change if: no star set yet, or round is open, or (round is active and change not used)
  RETURN jsonb_build_object(
    'star_team_id', COALESCE(v_star_record.star_team_id, null),
    'change_used', COALESCE(v_star_record.change_used, false),
    'can_change', CASE 
      WHEN v_star_record.id IS NULL THEN true  -- No star set yet
      WHEN v_round_status = 'open' THEN true   -- Round still open
      WHEN v_round_status = 'active' AND NOT COALESCE(v_star_record.change_used, false) THEN true
      ELSE false
    END
  );
END;
$$;