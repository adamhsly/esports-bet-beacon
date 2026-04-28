
ALTER TABLE public.trivia_grid_templates
  ADD COLUMN IF NOT EXISTS last_served_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_trivia_grid_templates_pool
  ON public.trivia_grid_templates (esport, is_active, is_generated, last_served_at NULLS FIRST);

-- Picks a random pre-baked board for the esport, avoiding ones the user has
-- seen recently (if user_id provided). Stamps last_served_at and returns the
-- chosen template id.
CREATE OR REPLACE FUNCTION public.trivia_pick_random_generated_board(
  _esport text,
  _user_id uuid DEFAULT NULL,
  _recent_window int DEFAULT 10
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    SELECT id INTO v_id
    FROM public.trivia_grid_templates
    WHERE esport = _esport AND is_active = true AND is_generated = true
    ORDER BY last_served_at NULLS FIRST, random()
    LIMIT 1;
  ELSE
    SELECT t.id INTO v_id
    FROM public.trivia_grid_templates t
    WHERE t.esport = _esport AND t.is_active = true AND t.is_generated = true
      AND NOT EXISTS (
        SELECT 1 FROM public.trivia_user_board_history h
        WHERE h.user_id = _user_id
          AND h.fingerprint IN (
            SELECT bf.fingerprint FROM public.trivia_board_fingerprints bf
            WHERE bf.fingerprint IS NOT NULL
              AND bf.row_clue_keys IS NOT NULL
          )
        ORDER BY h.created_at DESC
        LIMIT _recent_window
      )
    ORDER BY t.last_served_at NULLS FIRST, random()
    LIMIT 1;

    -- Fallback: ignore user history if filter eliminated everything.
    IF v_id IS NULL THEN
      SELECT id INTO v_id
      FROM public.trivia_grid_templates
      WHERE esport = _esport AND is_active = true AND is_generated = true
      ORDER BY last_served_at NULLS FIRST, random()
      LIMIT 1;
    END IF;
  END IF;

  IF v_id IS NOT NULL THEN
    UPDATE public.trivia_grid_templates
       SET last_served_at = now()
     WHERE id = v_id;
  END IF;

  RETURN v_id;
END;
$$;
