
-- Fix OlyBet match: ASTRAL won 2-0 (was incorrectly cancelled)
UPDATE pandascore_matches 
SET status = 'finished',
    raw_data = jsonb_set(
      COALESCE(raw_data, '{}'::jsonb), 
      '{results}', 
      '[{"score":2,"team_id":137440},{"score":0,"team_id":137449}]'::jsonb
    ),
    winner_id = '137440',
    updated_at = now()
WHERE match_id = '1356229';

-- Fix Omega match: ASTRAL forfeited, ensure forfeit=true and no winner (0 pts)
UPDATE pandascore_matches 
SET forfeit = true,
    updated_at = now()
WHERE match_id = '1364603';
