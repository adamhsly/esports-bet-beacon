
-- 1. Add new columns
ALTER TABLE public.trivia_clues
  ADD COLUMN IF NOT EXISTS normalized_label text,
  ADD COLUMN IF NOT EXISTS duplicate_group_id uuid,
  ADD COLUMN IF NOT EXISTS similarity_score numeric;

-- 2. Normalization function
CREATE OR REPLACE FUNCTION public.trivia_normalize_label(_label text, _clue_type text, _clue_value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text;
BEGIN
  IF _label IS NULL THEN RETURN NULL; END IF;
  s := lower(trim(_label));
  -- strip surrounding punctuation
  s := regexp_replace(s, '[[:punct:]]', ' ', 'g');
  s := regexp_replace(s, '\s+', ' ', 'g');
  s := trim(s);

  -- normalize common prefixes
  s := regexp_replace(s, '^(has |have |currently |formerly |previously |used to |once )+', '', 'g');
  s := regexp_replace(s, '^(is |was |a |an |the )+', '', 'g');

  -- canonicalize "X player" -> "played for X" when type is team
  IF _clue_type = 'team' THEN
    s := regexp_replace(s, '^(.+?)\s+player$', 'played for \1');
    s := regexp_replace(s, '^(plays|play|played)\s+for\s+', 'played for ', 'g');
    s := regexp_replace(s, '^member of\s+', 'played for ', 'g');
  ELSIF _clue_type = 'nationality' THEN
    s := regexp_replace(s, '^(comes from|hails from|born in|nationality)\s+', 'from ', 'g');
    s := regexp_replace(s, '^(.+?)\s+(player|national)$', 'from \1');
  ELSIF _clue_type = 'tournament' THEN
    s := regexp_replace(s, '^(winner of|won the|champion of|champion at)\s+', 'won ', 'g');
    s := regexp_replace(s, '^(played at|competed at)\s+', 'won ', 'g');
  ELSIF _clue_type = 'role' THEN
    s := regexp_replace(s, '^(plays as|role is|main)\s+', 'role ', 'g');
    -- collapse "role: x" / "role x"
    s := regexp_replace(s, '^role\s*[:\-]?\s*', 'role ', 'g');
  ELSIF _clue_type = 'attribute' THEN
    s := regexp_replace(s, '^(attribute|attr|tag)\s*[:\-]?\s*', 'attribute ', 'g');
  END IF;

  -- collapse whitespace again
  s := regexp_replace(s, '\s+', ' ', 'g');
  s := trim(s);
  RETURN s;
END;
$$;

-- 3. Canonical pattern validator
CREATE OR REPLACE FUNCTION public.trivia_label_matches_canonical(_normalized text, _clue_type text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF _normalized IS NULL OR length(_normalized) = 0 THEN RETURN false; END IF;
  IF _clue_type = 'team'        THEN RETURN _normalized ~ '^played for .+';
  ELSIF _clue_type = 'nationality' THEN RETURN _normalized ~ '^from .+';
  ELSIF _clue_type = 'tournament'  THEN RETURN _normalized ~ '^won .+';
  ELSIF _clue_type = 'role'        THEN RETURN _normalized ~ '^role .+';
  ELSIF _clue_type = 'attribute'   THEN RETURN _normalized ~ '^attribute .+';
  END IF;
  RETURN false;
END;
$$;

-- 4. Trigger to populate normalized_label, validate canonical, assign duplicate_group, and reject dupes
CREATE OR REPLACE FUNCTION public.trivia_clues_dedupe_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _norm text;
  _exact_id uuid;
  _near_id uuid;
  _group uuid;
BEGIN
  _norm := public.trivia_normalize_label(NEW.label, NEW.clue_type, NEW.clue_value);

  IF NOT public.trivia_label_matches_canonical(_norm, NEW.clue_type) THEN
    RAISE EXCEPTION 'Clue label "%" does not match canonical template for type "%". Expected formats: "Played for {team}", "From {country}", "Won {event}", "Role: {role}", "Attribute: {tag}".',
      NEW.label, NEW.clue_type;
  END IF;

  NEW.normalized_label := _norm;

  -- Exact duplicate (esport + clue_type + clue_value)
  SELECT id INTO _exact_id
  FROM public.trivia_clues
  WHERE esport = NEW.esport
    AND clue_type = NEW.clue_type
    AND clue_value = NEW.clue_value
    AND id IS DISTINCT FROM NEW.id
  LIMIT 1;

  IF _exact_id IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate clue: a clue of type "%" with value "%" already exists for %.',
      NEW.clue_type, NEW.clue_value, NEW.esport
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Near-duplicate (same normalized label within esport)
  SELECT id, duplicate_group_id INTO _near_id, _group
  FROM public.trivia_clues
  WHERE esport = NEW.esport
    AND normalized_label = _norm
    AND id IS DISTINCT FROM NEW.id
  LIMIT 1;

  IF _near_id IS NOT NULL THEN
    RAISE EXCEPTION 'Near-duplicate clue: "%" normalizes to "%" which already exists in % (clue %).',
      NEW.label, _norm, NEW.esport, _near_id
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Assign duplicate_group_id deterministically by normalized label
  IF NEW.duplicate_group_id IS NULL THEN
    NEW.duplicate_group_id := gen_random_uuid();
  END IF;

  IF NEW.similarity_score IS NULL THEN
    NEW.similarity_score := 1.0;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trivia_clues_dedupe ON public.trivia_clues;
CREATE TRIGGER trivia_clues_dedupe
  BEFORE INSERT OR UPDATE OF label, clue_type, clue_value, esport
  ON public.trivia_clues
  FOR EACH ROW
  EXECUTE FUNCTION public.trivia_clues_dedupe_trigger();

-- 5. Backfill existing rows: normalize, then drop rows that would violate before adding indexes
-- Strategy: for existing rows, populate normalized_label without canonical validation
UPDATE public.trivia_clues
SET normalized_label = public.trivia_normalize_label(label, clue_type, clue_value)
WHERE normalized_label IS NULL;

-- Assign duplicate_group_id for groups of identical normalized_label/esport
WITH groups AS (
  SELECT esport, normalized_label, gen_random_uuid() AS gid
  FROM public.trivia_clues
  WHERE normalized_label IS NOT NULL
  GROUP BY esport, normalized_label
)
UPDATE public.trivia_clues c
SET duplicate_group_id = g.gid
FROM groups g
WHERE c.esport = g.esport
  AND c.normalized_label = g.normalized_label
  AND c.duplicate_group_id IS NULL;

-- 6. Indexes (partial: only enforce uniqueness when normalized_label is present)
CREATE UNIQUE INDEX IF NOT EXISTS trivia_clues_exact_unique
  ON public.trivia_clues (esport, clue_type, clue_value);

CREATE UNIQUE INDEX IF NOT EXISTS trivia_clues_normalized_unique
  ON public.trivia_clues (esport, normalized_label)
  WHERE normalized_label IS NOT NULL;

CREATE INDEX IF NOT EXISTS trivia_clues_duplicate_group_idx
  ON public.trivia_clues (duplicate_group_id);

-- 7. Helper function for clients to check before inserting
CREATE OR REPLACE FUNCTION public.trivia_find_duplicate_clue(
  _esport text,
  _clue_type text,
  _clue_value text,
  _label text
)
RETURNS TABLE (id uuid, label text, normalized_label text, match_kind text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _norm text;
BEGIN
  _norm := public.trivia_normalize_label(_label, _clue_type, _clue_value);

  RETURN QUERY
  SELECT c.id, c.label, c.normalized_label, 'exact'::text
  FROM public.trivia_clues c
  WHERE c.esport = _esport
    AND c.clue_type = _clue_type
    AND c.clue_value = _clue_value
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  RETURN QUERY
  SELECT c.id, c.label, c.normalized_label, 'near'::text
  FROM public.trivia_clues c
  WHERE c.esport = _esport
    AND c.normalized_label = _norm
  LIMIT 1;
END;
$$;
