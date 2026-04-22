
-- ============================================================================
-- Trivia Clue Library
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trivia_clues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  clue_type text NOT NULL CHECK (clue_type IN ('team','nationality','tournament','role','attribute')),
  clue_value text NOT NULL,
  esport text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (esport, clue_type, clue_value)
);

CREATE INDEX IF NOT EXISTS idx_trivia_clues_esport_active
  ON public.trivia_clues (esport, is_active);

ALTER TABLE public.trivia_clues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active clues"
  ON public.trivia_clues FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert clues"
  ON public.trivia_clues FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update clues"
  ON public.trivia_clues FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete clues"
  ON public.trivia_clues FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_trivia_clues_updated
  BEFORE UPDATE ON public.trivia_clues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Grid Templates (saved 3x3 boards)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trivia_grid_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  esport text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  row_clue_ids uuid[] NOT NULL,
  col_clue_ids uuid[] NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (array_length(row_clue_ids, 1) = 3),
  CHECK (array_length(col_clue_ids, 1) = 3)
);

CREATE INDEX IF NOT EXISTS idx_trivia_grid_templates_esport_active
  ON public.trivia_grid_templates (esport, is_active);

ALTER TABLE public.trivia_grid_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active grid templates"
  ON public.trivia_grid_templates FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert grid templates"
  ON public.trivia_grid_templates FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update grid templates"
  ON public.trivia_grid_templates FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete grid templates"
  ON public.trivia_grid_templates FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_trivia_grid_templates_updated
  BEFORE UPDATE ON public.trivia_grid_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Validation function: does a player satisfy a clue?
-- Data-driven — branches on clue_type, evaluates against existing tables.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trivia_clue_matches_player(
  _player_id bigint,
  _clue_type text,
  _clue_value text
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ok boolean := false;
BEGIN
  IF _clue_type = 'team' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.pandascore_players_master
      WHERE id = _player_id
        AND current_team_id::text = _clue_value
    ) INTO _ok;

  ELSIF _clue_type = 'nationality' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.pandascore_players_master
      WHERE id = _player_id
        AND nationality = _clue_value
    ) INTO _ok;

  ELSIF _clue_type = 'role' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.pandascore_players_master
      WHERE id = _player_id
        AND role = _clue_value
    ) INTO _ok;

  ELSIF _clue_type = 'tournament' THEN
    -- Player participated in a match for the given tournament (by id or slug/name)
    SELECT EXISTS (
      SELECT 1
      FROM public.pandascore_matches m
      WHERE (m.tournament_id::text = _clue_value
             OR m.tournament_name = _clue_value
             OR m.league_name = _clue_value)
        AND (
          m.teams::text ILIKE '%"player_id":' || _player_id::text || '%'
          OR m.teams::text ILIKE '%"id":' || _player_id::text || '%'
        )
    ) INTO _ok;

  ELSIF _clue_type = 'attribute' THEN
    -- Generic attribute match against the master row's JSON-ish fields.
    SELECT EXISTS (
      SELECT 1 FROM public.pandascore_players_master p
      WHERE p.id = _player_id
        AND (
          p.role = _clue_value
          OR p.nationality = _clue_value
          OR p.videogame_name = _clue_value
        )
    ) INTO _ok;
  END IF;

  RETURN COALESCE(_ok, false);
END;
$$;

-- Replace the existing validate_pick to use the new evaluator.
CREATE OR REPLACE FUNCTION public.trivia_validate_pick(
  _player_id bigint,
  _row_type text,
  _row_value text,
  _col_type text,
  _col_value text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.trivia_clue_matches_player(_player_id, _row_type, _row_value)
     AND public.trivia_clue_matches_player(_player_id, _col_type, _col_value);
$$;
