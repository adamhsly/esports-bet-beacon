
INSERT INTO pandascore_matches (match_id, esport_type, teams, start_time, end_time, tournament_id, tournament_name, league_id, league_name, serie_id, serie_name, status, match_type, number_of_games, raw_data, updated_at, last_synced_at, videogame_id, videogame_name, winner_id)
VALUES
-- 100T vs CYBERSHOKE (2-0 win, LB Semi, Feb 27)
('draculan5_100t_cybershoke', 'Counter-Strike',
 '[{"type":"Team","opponent":{"id":126452,"name":"100 Thieves","slug":"100-thieves-cs-go","acronym":"100T","image_url":"https://cdn-api.pandascore.co/images/team/image/126452/8474.png"}},{"type":"Team","opponent":{"id":133542,"name":"CYBERSHOKE Esports","slug":"cybershoke-esports","acronym":"CS","image_url":"https://cdn-api.pandascore.co/images/team/image/133542/128px_cybershoke_esports_allmode.png"}}]'::jsonb,
 '2026-02-27T14:05:00Z', '2026-02-27T15:30:00Z',
 '20178', 'Playoffs', '5427', '5427', '10229', '',
 'finished', 'best_of', 3,
 '{"results":[{"score":2,"team_id":126452},{"score":0,"team_id":133542}],"opponents":[{"type":"Team","opponent":{"id":126452,"name":"100 Thieves"}},{"type":"Team","opponent":{"id":133542,"name":"CYBERSHOKE Esports"}}]}'::jsonb,
 now(), now(), '3', 'Counter-Strike', '126452'),

-- 100T vs Eternal Fire (2-0 win, LB Final, Feb 27)
('draculan5_100t_eternalfire', 'Counter-Strike',
 '[{"type":"Team","opponent":{"id":126452,"name":"100 Thieves","slug":"100-thieves-cs-go","acronym":"100T","image_url":"https://cdn-api.pandascore.co/images/team/image/126452/8474.png"}},{"type":"Team","opponent":{"id":129413,"name":"Eternal Fire","slug":"eternal-fire","acronym":"EF","image_url":"https://cdn-api.pandascore.co/images/team/image/129413/800px_eternal_fire_2023_allmode.png"}}]'::jsonb,
 '2026-02-27T18:00:00Z', '2026-02-27T19:30:00Z',
 '20178', 'Playoffs', '5427', '5427', '10229', '',
 'finished', 'best_of', 3,
 '{"results":[{"score":2,"team_id":126452},{"score":0,"team_id":129413}],"opponents":[{"type":"Team","opponent":{"id":126452,"name":"100 Thieves"}},{"type":"Team","opponent":{"id":129413,"name":"Eternal Fire"}}]}'::jsonb,
 now(), now(), '3', 'Counter-Strike', '126452'),

-- 100T vs FlyQuest (2-0 win, Consolidation Final, Feb 28)
('draculan5_100t_flyquest', 'Counter-Strike',
 '[{"type":"Team","opponent":{"id":126452,"name":"100 Thieves","slug":"100-thieves-cs-go","acronym":"100T","image_url":"https://cdn-api.pandascore.co/images/team/image/126452/8474.png"}},{"type":"Team","opponent":{"id":134746,"name":"FlyQuest","slug":"flyquest-cs-go","acronym":"FLY","image_url":"https://cdn.pandascore.co/images/team/image/134746/fly_questlogo_square.png"}}]'::jsonb,
 '2026-02-28T14:00:00Z', '2026-02-28T15:30:00Z',
 '20178', 'Playoffs', '5427', '5427', '10229', '',
 'finished', 'best_of', 3,
 '{"results":[{"score":2,"team_id":126452},{"score":0,"team_id":134746}],"opponents":[{"type":"Team","opponent":{"id":126452,"name":"100 Thieves"}},{"type":"Team","opponent":{"id":134746,"name":"FlyQuest"}}]}'::jsonb,
 now(), now(), '3', 'Counter-Strike', '126452'),

-- 100T vs HEROIC (1-2 loss, Grand Final, Feb 28)
('draculan5_100t_heroic', 'Counter-Strike',
 '[{"type":"Team","opponent":{"id":126452,"name":"100 Thieves","slug":"100-thieves-cs-go","acronym":"100T","image_url":"https://cdn-api.pandascore.co/images/team/image/126452/8474.png"}},{"type":"Team","opponent":{"id":3246,"name":"Heroic","slug":"heroic","acronym":"HERO","image_url":"https://cdn.pandascore.co/images/team/image/3246/680px_heroic_2023_allmode.png"}}]'::jsonb,
 '2026-02-28T18:30:00Z', '2026-02-28T20:30:00Z',
 '20178', 'Playoffs', '5427', '5427', '10229', '',
 'finished', 'best_of', 3,
 '{"results":[{"score":1,"team_id":126452},{"score":2,"team_id":3246}],"opponents":[{"type":"Team","opponent":{"id":126452,"name":"100 Thieves"}},{"type":"Team","opponent":{"id":3246,"name":"Heroic"}}]}'::jsonb,
 now(), now(), '3', 'Counter-Strike', '3246');
