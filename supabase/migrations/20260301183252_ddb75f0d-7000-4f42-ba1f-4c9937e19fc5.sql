-- Fix match 1358121: PARIVISION beat MOUZ 2-0 on Feb 21
UPDATE pandascore_matches SET status = 'finished', winner_id = '135712', updated_at = now() WHERE match_id = '1358121';