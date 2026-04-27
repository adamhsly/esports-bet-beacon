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
  s := regexp_replace(s, '[[:punct:]]', ' ', 'g');
  s := regexp_replace(s, '\s+', ' ', 'g');
  s := trim(s);

  s := regexp_replace(s, '^(has |have |currently |formerly |previously |used to |once )+', '', 'g');
  s := regexp_replace(s, '^(is |was |a |an |the )+', '', 'g');

  IF _clue_type = 'team' THEN
    s := regexp_replace(s, '^(.+?)\s+player$', 'played for \1');
    s := regexp_replace(s, '^(plays|play|played)\s+for\s+', 'played for ', 'g');
    s := regexp_replace(s, '^member of\s+', 'played for ', 'g');
  ELSIF _clue_type = 'nationality' THEN
    s := regexp_replace(s, '^(comes from|hails from|born in|nationality)\s+', 'from ', 'g');
    s := regexp_replace(s, '^(.+?)\s+(player|national)$', 'from \1');
  ELSIF _clue_type = 'tournament' THEN
    s := regexp_replace(s, '^(winner of|won the|champion of|champion at)\s+', 'won ', 'g');
    s := regexp_replace(s, '^(played at|competed at)\s+', 'played in ', 'g');
  ELSIF _clue_type = 'league' THEN
    s := regexp_replace(s, '^(played at|competed at)\s+', 'played in ', 'g');
  ELSIF _clue_type = 'year' THEN
    s := regexp_replace(s, '^(played during|competed during)\s+', 'played in ', 'g');
  ELSIF _clue_type = 'faced' THEN
    s := regexp_replace(s, '^(played against|opposed|against)\s+', 'faced ', 'g');
  ELSIF _clue_type = 'teammate' THEN
    s := regexp_replace(s, '^(teamed with|played with|team mate of|teammate)\s+', 'teammate of ', 'g');
    s := regexp_replace(s, '^teammate of of\s+', 'teammate of ', 'g');
  ELSIF _clue_type = 'role' THEN
    s := regexp_replace(s, '^(plays as|role is|main)\s+', 'role ', 'g');
    s := regexp_replace(s, '^role\s*[:\-]?\s*', 'role ', 'g');
  ELSIF _clue_type = 'attribute' THEN
    s := regexp_replace(s, '^(attribute|attr|tag)\s*[:\-]?\s*', 'attribute ', 'g');
  END IF;

  s := regexp_replace(s, '\s+', ' ', 'g');
  s := trim(s);
  RETURN s;
END;
$$;

CREATE OR REPLACE FUNCTION public.trivia_label_matches_canonical(_normalized text, _clue_type text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF _normalized IS NULL OR length(_normalized) = 0 THEN RETURN false; END IF;
  IF _clue_type = 'team' THEN
    RETURN _normalized ~ '^played for .+';
  ELSIF _clue_type = 'nationality' THEN
    RETURN _normalized ~ '^from .+';
  ELSIF _clue_type = 'tournament' THEN
    RETURN _normalized ~ '^(won|played in) .+';
  ELSIF _clue_type = 'league' THEN
    RETURN _normalized ~ '^played in .+';
  ELSIF _clue_type = 'year' THEN
    RETURN _normalized ~ '^played in [0-9]{4}$';
  ELSIF _clue_type = 'faced' THEN
    RETURN _normalized ~ '^faced .+';
  ELSIF _clue_type = 'teammate' THEN
    RETURN _normalized ~ '^teammate of .+';
  ELSIF _clue_type = 'role' THEN
    RETURN _normalized ~ '^role .+';
  ELSIF _clue_type = 'attribute' THEN
    RETURN _normalized ~ '^attribute .+';
  END IF;
  RETURN false;
END;
$$;

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
    RAISE EXCEPTION 'Clue label "%" does not match canonical template for type "%". Expected formats: "Played for {team}", "From {country}", "Won {event}", "Played in {league/event/year}", "Faced {team}", "Teammate of {player}", "Role: {role}", "Attribute: {tag}".',
      NEW.label, NEW.clue_type;
  END IF;

  NEW.normalized_label := _norm;

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

  IF NEW.duplicate_group_id IS NULL THEN
    NEW.duplicate_group_id := gen_random_uuid();
  END IF;

  IF NEW.similarity_score IS NULL THEN
    NEW.similarity_score := 1.0;
  END IF;

  RETURN NEW;
END;
$$;