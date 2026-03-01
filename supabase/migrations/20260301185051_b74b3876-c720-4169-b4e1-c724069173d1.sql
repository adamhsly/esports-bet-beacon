-- Fix PARIVISION vs SemperFi match (2026-03-01) - HLTV confirms 2-0 PARIVISION win
-- PandaScore API has stale data showing not_started
UPDATE pandascore_matches 
SET status = 'finished', 
    winner_id = '133719',
    updated_at = now()
WHERE match_id = '1376105';