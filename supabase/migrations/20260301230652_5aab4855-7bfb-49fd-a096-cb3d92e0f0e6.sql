-- Insert 4 missing DreamLeague Season 28 playoff matches (verified via Liquipedia)

-- Upper Bracket Final: Tundra 2-0 Team Liquid (Feb 28)
INSERT INTO pandascore_matches (match_id, esport_type, teams, start_time, tournament_id, tournament_name, league_id, league_name, serie_id, serie_name, status, match_type, number_of_games, updated_at, last_synced_at, videogame_id, videogame_name, winner_id, raw_data)
VALUES
('DL28_UBF', 'Dota 2', 
 '[{"id": 1647, "name": "Team Liquid", "slug": "team-liquid", "acronym": "Liquid", "location": "NL", "image_url": "https://cdn-api.pandascore.co/images/team/image/1647/527px_team_liquid_2023_lightmode.png"}, {"id": 128439, "name": "Tundra Esports", "slug": "tundra-esports", "acronym": "Tundra", "location": "GB", "image_url": "https://cdn-api.pandascore.co/images/team/image/128439/540px_tundra_esports_2020_full_lightmode.png"}]'::jsonb,
 '2026-02-28T18:00:00Z', '20141', 'Playoffs', '4125', 'DreamLeague', '10217', '', 'finished', 'best_of', 3,
 now(), now(), '4', 'Dota 2', '128439',
 '{"results": [{"score": 0, "team_id": 1647}, {"score": 2, "team_id": 128439}]}'::jsonb),

-- Lower Bracket Semifinal: Aurora 2-1 Xtreme Gaming (Feb 28)
('DL28_LBS', 'Dota 2',
 '[{"id": 133882, "name": "Aurora", "slug": "aurora-dota-2", "acronym": "AUR", "location": "RS", "image_url": "https://cdn-api.pandascore.co/images/team/image/133882/600px_aurora_gaming_2025_allmode.png"}, {"id": 128329, "name": "Xtreme Gaming", "slug": "xtreme-gaming", "acronym": "Xtreme", "location": "CN", "image_url": "https://cdn-api.pandascore.co/images/team/image/128329/t72899.png"}]'::jsonb,
 '2026-02-28T14:00:00Z', '20141', 'Playoffs', '4125', 'DreamLeague', '10217', '', 'finished', 'best_of', 3,
 now(), now(), '4', 'Dota 2', '133882',
 '{"results": [{"score": 2, "team_id": 133882}, {"score": 1, "team_id": 128329}]}'::jsonb),

-- Lower Bracket Final: Aurora 2-0 Team Liquid (Mar 1)
('DL28_LBF', 'Dota 2',
 '[{"id": 1647, "name": "Team Liquid", "slug": "team-liquid", "acronym": "Liquid", "location": "NL", "image_url": "https://cdn-api.pandascore.co/images/team/image/1647/527px_team_liquid_2023_lightmode.png"}, {"id": 133882, "name": "Aurora", "slug": "aurora-dota-2", "acronym": "AUR", "location": "RS", "image_url": "https://cdn-api.pandascore.co/images/team/image/133882/600px_aurora_gaming_2025_allmode.png"}]'::jsonb,
 '2026-03-01T12:00:00Z', '20141', 'Playoffs', '4125', 'DreamLeague', '10217', '', 'finished', 'best_of', 3,
 now(), now(), '4', 'Dota 2', '133882',
 '{"results": [{"score": 0, "team_id": 1647}, {"score": 2, "team_id": 133882}]}'::jsonb),

-- Grand Final: Tundra 3-1 Aurora (Mar 1, Bo5)
('DL28_GF', 'Dota 2',
 '[{"id": 128439, "name": "Tundra Esports", "slug": "tundra-esports", "acronym": "Tundra", "location": "GB", "image_url": "https://cdn-api.pandascore.co/images/team/image/128439/540px_tundra_esports_2020_full_lightmode.png"}, {"id": 133882, "name": "Aurora", "slug": "aurora-dota-2", "acronym": "AUR", "location": "RS", "image_url": "https://cdn-api.pandascore.co/images/team/image/133882/600px_aurora_gaming_2025_allmode.png"}]'::jsonb,
 '2026-03-01T16:00:00Z', '20141', 'Playoffs', '4125', 'DreamLeague', '10217', '', 'finished', 'best_of', 5,
 now(), now(), '4', 'Dota 2', '128439',
 '{"results": [{"score": 3, "team_id": 128439}, {"score": 1, "team_id": 133882}]}'::jsonb)

ON CONFLICT (match_id) DO UPDATE SET
  status = EXCLUDED.status,
  winner_id = EXCLUDED.winner_id,
  raw_data = EXCLUDED.raw_data,
  updated_at = now();
