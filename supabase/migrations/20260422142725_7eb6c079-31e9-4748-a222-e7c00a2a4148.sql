
-- Board fingerprint registry (global)
CREATE TABLE IF NOT EXISTS public.trivia_board_fingerprints (
  fingerprint text PRIMARY KEY,
  esport text NOT NULL,
  structure_signature text NOT NULL,
  clue_type_counts jsonb NOT NULL,
  row_clue_keys text[] NOT NULL,
  col_clue_keys text[] NOT NULL,
  times_used integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  similarity_score numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trivia_board_fp_esport_last_used
  ON public.trivia_board_fingerprints (esport, last_used_at DESC);
CREATE INDEX IF NOT EXISTS trivia_board_fp_structure
  ON public.trivia_board_fingerprints (esport, structure_signature);

ALTER TABLE public.trivia_board_fingerprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fingerprints readable by all" ON public.trivia_board_fingerprints;
CREATE POLICY "fingerprints readable by all"
  ON public.trivia_board_fingerprints FOR SELECT
  USING (true);

-- Per-user board history
CREATE TABLE IF NOT EXISTS public.trivia_user_board_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  esport text NOT NULL,
  fingerprint text NOT NULL,
  structure_signature text,
  seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trivia_user_history_user_esport_seen
  ON public.trivia_user_board_history (user_id, esport, seen_at DESC);

ALTER TABLE public.trivia_user_board_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own board history" ON public.trivia_user_board_history;
CREATE POLICY "users see own board history"
  ON public.trivia_user_board_history FOR SELECT
  USING (auth.uid() = user_id);

-- Track fingerprint on each session so we can audit repeats
ALTER TABLE public.trivia_sessions
  ADD COLUMN IF NOT EXISTS board_fingerprint text;

CREATE INDEX IF NOT EXISTS trivia_sessions_fingerprint_idx
  ON public.trivia_sessions (board_fingerprint);

-- Register a board hit (called by the edge function with service role)
CREATE OR REPLACE FUNCTION public.trivia_register_board_use(
  _fingerprint text,
  _esport text,
  _structure_signature text,
  _clue_type_counts jsonb,
  _row_clue_keys text[],
  _col_clue_keys text[],
  _user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.trivia_board_fingerprints
    (fingerprint, esport, structure_signature, clue_type_counts,
     row_clue_keys, col_clue_keys, times_used, last_used_at)
  VALUES
    (_fingerprint, _esport, _structure_signature, _clue_type_counts,
     _row_clue_keys, _col_clue_keys, 1, now())
  ON CONFLICT (fingerprint) DO UPDATE
    SET times_used = public.trivia_board_fingerprints.times_used + 1,
        last_used_at = now();

  IF _user_id IS NOT NULL THEN
    INSERT INTO public.trivia_user_board_history
      (user_id, esport, fingerprint, structure_signature)
    VALUES
      (_user_id, _esport, _fingerprint, _structure_signature);
  END IF;
END;
$$;

-- Read recent fingerprints for a user (used by the generator to avoid repeats)
CREATE OR REPLACE FUNCTION public.trivia_recent_user_fingerprints(
  _user_id uuid,
  _esport text,
  _limit integer DEFAULT 10
)
RETURNS TABLE(fingerprint text, structure_signature text, seen_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fingerprint, structure_signature, seen_at
  FROM public.trivia_user_board_history
  WHERE user_id = _user_id AND esport = _esport
  ORDER BY seen_at DESC
  LIMIT GREATEST(_limit, 1);
$$;
