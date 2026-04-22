
-- 1) Per-clue usage counters
CREATE TABLE IF NOT EXISTS public.trivia_clue_usage (
  clue_key text PRIMARY KEY,             -- "type:value"
  esport text NOT NULL,
  times_used integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trivia_clue_usage_esport_last
  ON public.trivia_clue_usage (esport, last_used_at DESC);

ALTER TABLE public.trivia_clue_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clue usage readable by all" ON public.trivia_clue_usage;
CREATE POLICY "clue usage readable by all"
  ON public.trivia_clue_usage FOR SELECT USING (true);

-- 2) Quality fields on the board fingerprint registry
ALTER TABLE public.trivia_board_fingerprints
  ADD COLUMN IF NOT EXISTS quality_score    numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS solvability_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS difficulty_score  numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS diversity_score   numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freshness_score   numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published         boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS trivia_board_fp_published_quality
  ON public.trivia_board_fingerprints (esport, published, quality_score DESC);

-- 3) Rejected boards (for analysis)
CREATE TABLE IF NOT EXISTS public.trivia_board_rejections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  esport text NOT NULL,
  fingerprint text,
  reason text NOT NULL,
  quality_score numeric,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.trivia_board_rejections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rejections readable by all" ON public.trivia_board_rejections;
CREATE POLICY "rejections readable by all"
  ON public.trivia_board_rejections FOR SELECT USING (true);

-- 4) RPC: bump clue usage in bulk
CREATE OR REPLACE FUNCTION public.trivia_register_clue_use(
  _clue_keys text[],
  _esport text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.trivia_clue_usage (clue_key, esport, times_used, last_used_at)
  SELECT k, _esport, 1, now()
  FROM unnest(_clue_keys) AS k
  ON CONFLICT (clue_key) DO UPDATE
    SET times_used = public.trivia_clue_usage.times_used + 1,
        last_used_at = now();
END;
$$;

-- 5) RPC: finalize a board's quality scores + publish flag
CREATE OR REPLACE FUNCTION public.trivia_finalize_board_quality(
  _fingerprint text,
  _quality numeric,
  _solvability numeric,
  _difficulty numeric,
  _diversity numeric,
  _freshness numeric,
  _published boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.trivia_board_fingerprints
  SET quality_score    = _quality,
      solvability_score = _solvability,
      difficulty_score  = _difficulty,
      diversity_score   = _diversity,
      freshness_score   = _freshness,
      published         = _published
  WHERE fingerprint = _fingerprint;
END;
$$;

-- 6) RPC: log a rejection
CREATE OR REPLACE FUNCTION public.trivia_log_board_rejection(
  _esport text,
  _fingerprint text,
  _reason text,
  _quality numeric,
  _details jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.trivia_board_rejections (esport, fingerprint, reason, quality_score, details)
  VALUES (_esport, _fingerprint, _reason, _quality, _details);
END;
$$;

-- 7) RPC: top published boards for fallback
CREATE OR REPLACE FUNCTION public.trivia_top_boards(_esport text, _limit integer DEFAULT 10)
RETURNS TABLE(
  fingerprint text,
  quality_score numeric,
  row_clue_keys text[],
  col_clue_keys text[],
  last_used_at timestamptz,
  times_used integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fingerprint, quality_score, row_clue_keys, col_clue_keys, last_used_at, times_used
  FROM public.trivia_board_fingerprints
  WHERE esport = _esport AND published = true
  ORDER BY quality_score DESC, last_used_at NULLS FIRST
  LIMIT GREATEST(_limit, 1);
$$;
