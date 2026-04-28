
ALTER TABLE public.trivia_board_fingerprints
  ADD COLUMN IF NOT EXISTS clue_labels jsonb,
  ADD COLUMN IF NOT EXISTS last_served_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_trivia_board_fingerprints_pool
  ON public.trivia_board_fingerprints (esport, published, last_served_at NULLS FIRST);

DROP FUNCTION IF EXISTS public.trivia_pick_random_generated_board(text, uuid, int);

CREATE OR REPLACE FUNCTION public.trivia_pick_baked_board(
  _esport text,
  _user_id uuid DEFAULT NULL,
  _recent_window int DEFAULT 10
)
RETURNS TABLE (
  fingerprint text,
  row_clue_keys text[],
  col_clue_keys text[],
  clue_labels jsonb,
  quality_score numeric,
  recognition_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fp text;
BEGIN
  IF _user_id IS NULL THEN
    SELECT bf.fingerprint INTO v_fp
    FROM public.trivia_board_fingerprints bf
    WHERE bf.esport = _esport
      AND bf.published = true
      AND bf.clue_labels IS NOT NULL
    ORDER BY bf.last_served_at NULLS FIRST, random()
    LIMIT 1;
  ELSE
    SELECT bf.fingerprint INTO v_fp
    FROM public.trivia_board_fingerprints bf
    WHERE bf.esport = _esport
      AND bf.published = true
      AND bf.clue_labels IS NOT NULL
      AND bf.fingerprint NOT IN (
        SELECT h.fingerprint FROM public.trivia_user_board_history h
        WHERE h.user_id = _user_id
        ORDER BY h.created_at DESC
        LIMIT _recent_window
      )
    ORDER BY bf.last_served_at NULLS FIRST, random()
    LIMIT 1;

    IF v_fp IS NULL THEN
      SELECT bf.fingerprint INTO v_fp
      FROM public.trivia_board_fingerprints bf
      WHERE bf.esport = _esport
        AND bf.published = true
        AND bf.clue_labels IS NOT NULL
      ORDER BY bf.last_served_at NULLS FIRST, random()
      LIMIT 1;
    END IF;
  END IF;

  IF v_fp IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.trivia_board_fingerprints
     SET last_served_at = now()
   WHERE fingerprint = v_fp;

  RETURN QUERY
  SELECT bf.fingerprint, bf.row_clue_keys, bf.col_clue_keys,
         bf.clue_labels, bf.quality_score, bf.recognition_score
  FROM public.trivia_board_fingerprints bf
  WHERE bf.fingerprint = v_fp;
END;
$$;
