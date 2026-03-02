UPDATE pandascore_matches 
SET 
  status = 'finished',
  winner_id = '135126',
  winner_type = 'Team',
  raw_data = raw_data || '{"status": "finished", "winner_id": 135126, "end_at": "2026-03-02T11:50:38Z", "modified_at": "2026-03-02T11:53:20Z", "results": [{"score": 1, "team_id": 137932}, {"score": 2, "team_id": 135126}]}'::jsonb,
  updated_at = now()
WHERE match_id = '1355844';
