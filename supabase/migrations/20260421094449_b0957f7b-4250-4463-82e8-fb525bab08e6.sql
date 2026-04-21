
-- 1. pickems_slates
CREATE TABLE public.pickems_slates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  tournament_id text,
  tournament_name text,
  esport_type text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pickems_slates_status_check CHECK (status IN ('draft','published','closed','settled'))
);

CREATE INDEX idx_pickems_slates_status ON public.pickems_slates(status);
CREATE INDEX idx_pickems_slates_dates ON public.pickems_slates(start_date, end_date);

-- 2. pickems_slate_matches
CREATE TABLE public.pickems_slate_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slate_id uuid NOT NULL REFERENCES public.pickems_slates(id) ON DELETE CASCADE,
  match_id text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(slate_id, match_id)
);

CREATE INDEX idx_pickems_slate_matches_slate ON public.pickems_slate_matches(slate_id);
CREATE INDEX idx_pickems_slate_matches_match ON public.pickems_slate_matches(match_id);

-- 3. pickems_entries
CREATE TABLE public.pickems_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slate_id uuid NOT NULL REFERENCES public.pickems_slates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  total_score int NOT NULL DEFAULT 0,
  correct_picks int NOT NULL DEFAULT 0,
  total_picks int NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(slate_id, user_id)
);

CREATE INDEX idx_pickems_entries_leaderboard ON public.pickems_entries(slate_id, total_score DESC, submitted_at ASC);
CREATE INDEX idx_pickems_entries_user ON public.pickems_entries(user_id);

-- 4. pickems_picks
CREATE TABLE public.pickems_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.pickems_entries(id) ON DELETE CASCADE,
  slate_id uuid NOT NULL REFERENCES public.pickems_slates(id) ON DELETE CASCADE,
  match_id text NOT NULL,
  picked_team_id text NOT NULL,
  is_correct boolean,
  points_awarded int NOT NULL DEFAULT 0,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entry_id, match_id)
);

CREATE INDEX idx_pickems_picks_slate_match ON public.pickems_picks(slate_id, match_id);
CREATE INDEX idx_pickems_picks_entry ON public.pickems_picks(entry_id);

-- Updated_at trigger function (reuse if exists, otherwise create)
CREATE OR REPLACE FUNCTION public.pickems_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pickems_slates_updated_at
  BEFORE UPDATE ON public.pickems_slates
  FOR EACH ROW EXECUTE FUNCTION public.pickems_set_updated_at();

CREATE TRIGGER trg_pickems_entries_updated_at
  BEFORE UPDATE ON public.pickems_entries
  FOR EACH ROW EXECUTE FUNCTION public.pickems_set_updated_at();

CREATE TRIGGER trg_pickems_picks_updated_at
  BEFORE UPDATE ON public.pickems_picks
  FOR EACH ROW EXECUTE FUNCTION public.pickems_set_updated_at();

-- Enable RLS
ALTER TABLE public.pickems_slates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickems_slate_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickems_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickems_picks ENABLE ROW LEVEL SECURITY;

-- RLS: pickems_slates
CREATE POLICY "Public can view non-draft slates"
  ON public.pickems_slates FOR SELECT
  USING (status <> 'draft');

CREATE POLICY "Admins can view all slates"
  ON public.pickems_slates FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert slates"
  ON public.pickems_slates FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update slates"
  ON public.pickems_slates FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete slates"
  ON public.pickems_slates FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS: pickems_slate_matches
CREATE POLICY "Public can view slate matches for non-draft slates"
  ON public.pickems_slate_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pickems_slates s
      WHERE s.id = pickems_slate_matches.slate_id
        AND (s.status <> 'draft' OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Admins can insert slate matches"
  ON public.pickems_slate_matches FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update slate matches"
  ON public.pickems_slate_matches FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete slate matches"
  ON public.pickems_slate_matches FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS: pickems_entries
CREATE POLICY "Entries are publicly viewable"
  ON public.pickems_entries FOR SELECT
  USING (true);

CREATE POLICY "Users can create own entries"
  ON public.pickems_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON public.pickems_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all entries"
  ON public.pickems_entries FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS: pickems_picks
CREATE POLICY "Picks are publicly viewable"
  ON public.pickems_picks FOR SELECT
  USING (true);

CREATE POLICY "Users can create picks for own entries"
  ON public.pickems_picks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pickems_entries e
      WHERE e.id = pickems_picks.entry_id
        AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update picks for own entries"
  ON public.pickems_picks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.pickems_entries e
      WHERE e.id = pickems_picks.entry_id
        AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pickems_entries e
      WHERE e.id = pickems_picks.entry_id
        AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete picks for own entries"
  ON public.pickems_picks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.pickems_entries e
      WHERE e.id = pickems_picks.entry_id
        AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all picks"
  ON public.pickems_picks FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
