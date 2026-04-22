
-- Trivia game: minimal schema, reuses pandascore_players_master / pandascore_teams for all content

-- 1. Sessions: one row per game (solo or 2-player same-screen)
CREATE TABLE public.trivia_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  mode text NOT NULL CHECK (mode IN ('solo','two_player')),
  esport text NOT NULL,                -- e.g. 'Counter-Strike','LoL','Valorant'
  board jsonb NOT NULL,                -- { rowClues:[{type,value,label}x3], colClues:[...x3] }
  cells jsonb NOT NULL DEFAULT '[[null,null,null],[null,null,null],[null,null,null]]'::jsonb,
                                       -- 3x3 array of { player_id, player_name, claimed_by:'p1'|'p2', at }
  current_turn text NOT NULL DEFAULT 'p1' CHECK (current_turn IN ('p1','p2')),
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','won','draw','abandoned')),
  winner text CHECK (winner IN ('p1','p2','draw')),
  player1_label text DEFAULT 'Player 1',
  player2_label text DEFAULT 'Player 2',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX idx_trivia_sessions_created_by ON public.trivia_sessions(created_by);
CREATE INDEX idx_trivia_sessions_status ON public.trivia_sessions(status);

ALTER TABLE public.trivia_sessions ENABLE ROW LEVEL SECURITY;

-- Sessions are private to creator (anonymous solo allowed via NULL created_by + permissive insert)
CREATE POLICY "Anyone can create a trivia session"
  ON public.trivia_sessions FOR INSERT
  WITH CHECK (created_by IS NULL OR auth.uid() = created_by);

CREATE POLICY "View own sessions or anonymous sessions"
  ON public.trivia_sessions FOR SELECT
  USING (created_by IS NULL OR auth.uid() = created_by);

CREATE POLICY "Update own sessions or anonymous sessions"
  ON public.trivia_sessions FOR UPDATE
  USING (created_by IS NULL OR auth.uid() = created_by);

-- 2. Moves: audit trail (one row per submission attempt)
CREATE TABLE public.trivia_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.trivia_sessions(id) ON DELETE CASCADE,
  row_idx int NOT NULL CHECK (row_idx BETWEEN 0 AND 2),
  col_idx int NOT NULL CHECK (col_idx BETWEEN 0 AND 2),
  player_id bigint,                    -- pandascore_players_master.id
  player_name text NOT NULL,
  claimed_by text NOT NULL CHECK (claimed_by IN ('p1','p2')),
  was_correct boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trivia_moves_session ON public.trivia_moves(session_id);

ALTER TABLE public.trivia_moves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View moves of accessible sessions"
  ON public.trivia_moves FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trivia_sessions s
    WHERE s.id = trivia_moves.session_id
      AND (s.created_by IS NULL OR s.created_by = auth.uid())
  ));

CREATE POLICY "Insert moves into accessible sessions"
  ON public.trivia_moves FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trivia_sessions s
    WHERE s.id = trivia_moves.session_id
      AND (s.created_by IS NULL OR s.created_by = auth.uid())
  ));

-- 3. updated_at trigger
CREATE TRIGGER trg_trivia_sessions_updated
  BEFORE UPDATE ON public.trivia_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Clue validator: returns true if a player satisfies a clue
CREATE OR REPLACE FUNCTION public.trivia_player_matches_clue(
  _player_id bigint,
  _clue_type text,
  _clue_value text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE _clue_type
    WHEN 'team' THEN EXISTS (
      SELECT 1 FROM pandascore_players_master p
      WHERE p.id = _player_id AND p.current_team_id::text = _clue_value
    )
    WHEN 'nationality' THEN EXISTS (
      SELECT 1 FROM pandascore_players_master p
      WHERE p.id = _player_id AND lower(p.nationality) = lower(_clue_value)
    )
    WHEN 'role' THEN EXISTS (
      SELECT 1 FROM pandascore_players_master p
      WHERE p.id = _player_id AND lower(p.role) = lower(_clue_value)
    )
    WHEN 'game' THEN EXISTS (
      SELECT 1 FROM pandascore_players_master p
      WHERE p.id = _player_id AND lower(p.videogame_name) = lower(_clue_value)
    )
    ELSE false
  END;
$$;

-- 5. Validate a full pick (player satisfies BOTH row & col clues)
CREATE OR REPLACE FUNCTION public.trivia_validate_pick(
  _player_id bigint,
  _row_type text, _row_value text,
  _col_type text, _col_value text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.trivia_player_matches_clue(_player_id, _row_type, _row_value)
     AND public.trivia_player_matches_clue(_player_id, _col_type, _col_value);
$$;
