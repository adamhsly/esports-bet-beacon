-- Create Season 2
INSERT INTO seasons (name, starts_at, ends_at)
VALUES (
  'Season 2',
  NOW(),
  NOW() + interval '60 days'
);

-- Copy rewards from Season 1 to Season 2
INSERT INTO season_rewards (season_id, tier, reward_type, reward_value, level_required)
SELECT 
  (SELECT id FROM seasons WHERE name = 'Season 2'),
  tier,
  reward_type,
  reward_value,
  level_required
FROM season_rewards
WHERE season_id = '4ecf390b-f445-48f8-a4b7-6d7ba003b7fe';