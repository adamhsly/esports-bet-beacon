ALTER TABLE public.pickems_slates
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_tournament_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pickems_slates_auto_tournament
  ON public.pickems_slates (source_tournament_id)
  WHERE auto_generated = true;

CREATE INDEX IF NOT EXISTS idx_pickems_slates_status_dates
  ON public.pickems_slates (status, start_date);