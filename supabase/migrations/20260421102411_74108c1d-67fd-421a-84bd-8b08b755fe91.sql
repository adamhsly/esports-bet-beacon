
ALTER TABLE public.pickems_picks
  ADD COLUMN IF NOT EXISTS tiebreaker_total_maps integer;

ALTER TABLE public.pickems_entries
  ADD COLUMN IF NOT EXISTS streak_bonus integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiebreaker_total_maps integer,
  ADD COLUMN IF NOT EXISTS tiebreaker_actual integer,
  ADD COLUMN IF NOT EXISTS tiebreaker_delta integer;

ALTER TABLE public.pickems_slates
  ADD COLUMN IF NOT EXISTS tiebreaker_match_id text;

CREATE INDEX IF NOT EXISTS idx_pickems_entries_ranking
  ON public.pickems_entries (slate_id, total_score DESC, tiebreaker_delta NULLS LAST, submitted_at ASC);
