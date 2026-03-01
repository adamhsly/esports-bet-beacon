-- Fix DreamLeague Season 28 Stage 2 Feb 27 matches - PandaScore has 0-0 scores but correct winners
-- Verified scores from Liquipedia

-- Match 1358118: Tundra (128439) 1-2 Liquid (1647)
UPDATE pandascore_matches 
SET raw_data = jsonb_set(
  raw_data,
  '{results}',
  '[{"score": 1, "team_id": 128439}, {"score": 2, "team_id": 1647}]'::jsonb
),
updated_at = now()
WHERE match_id = '1358118';

-- Match 1358119: Aurora (133882) 2-1 BetBoom (130768)
UPDATE pandascore_matches 
SET raw_data = jsonb_set(
  raw_data,
  '{results}',
  '[{"score": 2, "team_id": 133882}, {"score": 1, "team_id": 130768}]'::jsonb
),
updated_at = now()
WHERE match_id = '1358119';

-- Match 1358120: Xtreme Gaming (128329) 1-2 Team Falcons (133868)
UPDATE pandascore_matches 
SET raw_data = jsonb_set(
  raw_data,
  '{results}',
  '[{"score": 1, "team_id": 128329}, {"score": 2, "team_id": 133868}]'::jsonb
),
updated_at = now()
WHERE match_id = '1358120';

-- Match 1358121: PARIVISION (135712) 2-0 MOUZ (134559)
UPDATE pandascore_matches 
SET raw_data = jsonb_set(
  raw_data,
  '{results}',
  '[{"score": 2, "team_id": 135712}, {"score": 0, "team_id": 134559}]'::jsonb
),
updated_at = now()
WHERE match_id = '1358121';