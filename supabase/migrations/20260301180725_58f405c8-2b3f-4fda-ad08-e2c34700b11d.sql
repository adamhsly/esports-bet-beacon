-- Fix Feb 27 matches with correct results from 3rd party verification
UPDATE pandascore_matches SET status = 'finished', winner_id = '1647', updated_at = now() WHERE match_id = '1358118';
UPDATE pandascore_matches SET status = 'finished', winner_id = '133882', updated_at = now() WHERE match_id = '1358119';
UPDATE pandascore_matches SET status = 'finished', winner_id = '133868', updated_at = now() WHERE match_id = '1358120';

-- Fix cancelled-but-finished matches (raw_data shows finished with winner)
UPDATE pandascore_matches SET status = 'finished', winner_id = '130535', updated_at = now() WHERE match_id = '1376223';
UPDATE pandascore_matches SET status = 'finished', winner_id = '1931', updated_at = now() WHERE match_id = '1376224';