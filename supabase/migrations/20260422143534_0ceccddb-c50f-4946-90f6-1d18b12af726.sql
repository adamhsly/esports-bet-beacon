-- Difficulty balancing for trivia
-- 1) Per-clue difficulty cache
CREATE TABLE IF NOT EXISTS public.trivia_clue_difficulty (
  clue_key text PRIMARY KEY,                -- "type:value"
  esport text NOT NULL,
  clue_type text NOT NULL,
  clue_value text NOT NULL,
  player_count integer NOT NULL DEFAULT 0,  -- distinct players that satisfy the clue
  difficulty_band text NOT NULL DEFAULT 'medium' CHECK (difficulty_band IN ('easy','medium','hard')),
  difficulty_score numeric NOT NULL DEFAULT 0.5, -- 0 (easiest) .. 1 (hardest)
  computed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trivia_clue_difficulty_esport_band
  ON public.trivia_clue_difficulty (esport, difficulty_band);

ALTER TABLE public.trivia_clue_difficulty ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clue difficulty readable by all" ON public.trivia_clue_difficulty;
CREATE POLICY "clue difficulty readable by all"
  ON public.trivia_clue_difficulty FOR SELECT USING (true);

-- 2) Board-level difficulty fields
ALTER TABLE public.trivia_board_fingerprints
  ADD COLUMN IF NOT EXISTS board_difficulty       text DEFAULT 'medium'
    CHECK (board_difficulty IN ('easy','medium','hard')),
  ADD COLUMN IF NOT EXISTS board_difficulty_score numeric DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS avg_cell_answers       numeric DEFAULT 0;

CREATE INDEX IF NOT EXISTS trivia_board_fp_difficulty
  ON public.trivia_board_fingerprints (esport, published, board_difficulty, quality_score DESC);

-- 3) RPC: bulk upsert clue difficulty
CREATE OR REPLACE FUNCTION public.trivia_upsert_clue_difficulty(
  _rows jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.trivia_clue_difficulty
    (clue_key, esport, clue_type, clue_value, player_count, difficulty_band, difficulty_score, computed_at)
  SELECT
    (r->>'clue_key')::text,
    (r->>'esport')::text,
    (r->>'clue_type')::text,
    (r->>'clue_value')::text,
    COALESCE((r->>'player_count')::int, 0),
    COALESCE((r->>'difficulty_band')::text, 'medium'),
    COALESCE((r->>'difficulty_score')::numeric, 0.5),
    now()
  FROM jsonb_array_elements(_rows) AS r
  ON CONFLICT (clue_key) DO UPDATE
    SET player_count     = EXCLUDED.player_count,
        difficulty_band  = EXCLUDED.difficulty_band,
        difficulty_score = EXCLUDED.difficulty_score,
        computed_at      = now();
END;
$$;

-- 4) RPC: finalize board difficulty alongside other quality fields
CREATE OR REPLACE FUNCTION public.trivia_finalize_board_difficulty(
  _fingerprint text,
  _board_difficulty text,
  _board_difficulty_score numeric,
  _avg_cell_answers numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.trivia_board_fingerprints
  SET board_difficulty       = _board_difficulty,
      board_difficulty_score = _board_difficulty_score,
      avg_cell_answers       = _avg_cell_answers
  WHERE fingerprint = _fingerprint;
END;
$$;

-- 5) RPC: count finished sessions for a user (used for progression)
CREATE OR REPLACE FUNCTION public.trivia_user_session_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.trivia_sessions WHERE created_by = _user_id;
$$;