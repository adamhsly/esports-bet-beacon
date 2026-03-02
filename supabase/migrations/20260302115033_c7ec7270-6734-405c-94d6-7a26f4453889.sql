
-- 1. Remove duplicate manual entries that overlap with real PandaScore data
DELETE FROM pandascore_matches WHERE match_id IN ('DL28_UBF', 'DL28_LBS');

-- 2. Insert missing HOTU 1-2 Omega Bo3 Semifinal (Feb 27, MySkill Pro League Series 2)
INSERT INTO pandascore_matches (match_id, esport_type, teams, start_time, tournament_id, tournament_name, league_id, league_name, serie_id, status, match_type, number_of_games, updated_at, last_synced_at, videogame_id, videogame_name, winner_id, raw_data)
VALUES
('MSK2_SF1', 'Counter-Strike',
 '[{"type": "Team", "opponent": {"id": 130569, "name": "HOTU", "slug": "hotu", "acronym": "HOTU", "location": "RU", "image_url": "https://cdn-api.pandascore.co/images/team/image/130569/148px_hotu_2022_lightmode.png"}}, {"type": "Team", "opponent": {"id": 137584, "name": "Omega", "slug": "omega", "acronym": "OMG", "location": "KZ", "image_url": "https://cdn-api.pandascore.co/images/team/image/137584/198px_omega_team_lightmode.png"}}]'::jsonb,
 '2026-02-27T06:15:00Z', NULL, 'Playoffs', '5429', '5429', NULL, 'finished', 'best_of', 3,
 now(), now(), '3', 'Counter-Strike', '137584',
 '{"results": [{"score": 1, "team_id": 130569}, {"score": 2, "team_id": 137584}]}'::jsonb)
ON CONFLICT (match_id) DO UPDATE SET
  status = EXCLUDED.status,
  winner_id = EXCLUDED.winner_id,
  raw_data = EXCLUDED.raw_data,
  updated_at = now();
