-- First, insert all required reward items with types into reward_items table
INSERT INTO reward_items (code, name, type) VALUES
  ('frame_basic_static', 'Avatar Frame (Basic)', 'cosmetic'),
  ('frame_neon_pulse', 'Avatar Frame (Neon Pulse)', 'cosmetic'),
  ('frame_royal_gem', 'Avatar Frame (Royal Gem)', 'cosmetic'),
  ('frame_cyber_gold', 'Avatar Frame (Cyber Gold)', 'cosmetic'),
  ('border_steel_static', 'Profile Border (Steel)', 'cosmetic'),
  ('border_neon_blue', 'Profile Border (Neon Blue)', 'cosmetic'),
  ('border_neon_pulse', 'Profile Border (Neon Pulse)', 'cosmetic'),
  ('border_royal_gem', 'Profile Border (Royal Gem)', 'cosmetic'),
  ('border_arcane_violet', 'Profile Border (Arcane Violet)', 'cosmetic'),
  ('border_sunforge_gold_anim', 'Profile Border (Sunforge Gold)', 'cosmetic')
ON CONFLICT (code) DO NOTHING;

-- Clear existing level rewards (backup data if needed)
DELETE FROM level_rewards WHERE level BETWEEN 1 AND 25;

-- Insert new FREE track rewards
INSERT INTO level_rewards (level, track, reward_type, item_code, amount) VALUES
  (1, 'free', 'item', 'badge_starter_bronze', NULL),
  (2, 'free', 'credits', NULL, 50),
  (3, 'free', 'item', 'frame_basic_static', NULL),
  (4, 'free', 'credits', NULL, 100),
  (5, 'free', 'item', 'border_steel_static', NULL),
  (6, 'free', 'item', 'badge_underdog_bronze', NULL),
  (7, 'free', 'credits', NULL, 200),
  (8, 'free', 'item', 'frame_neon_pulse', NULL),
  (9, 'free', 'credits', NULL, 200),
  (10, 'free', 'item', 'badge_elite_static', NULL),
  (12, 'free', 'item', 'border_neon_blue', NULL),
  (15, 'free', 'credits', NULL, 300),
  (18, 'free', 'item', 'frame_royal_gem', NULL),
  (20, 'free', 'item', 'badge_season_survivor_silver', NULL),
  (25, 'free', 'item', 'border_royal_gem', NULL);

-- Insert new PREMIUM track rewards
INSERT INTO level_rewards (level, track, reward_type, item_code, amount) VALUES
  (1, 'premium', 'item', 'badge_starter_gold_anim', NULL),
  (2, 'premium', 'credits', NULL, 200),
  (3, 'premium', 'item', 'frame_pulse_violet_anim', NULL),
  (4, 'premium', 'credits', NULL, 250),
  (5, 'premium', 'item', 'border_arcane_violet', NULL),
  (6, 'premium', 'item', 'badge_underdog_gold_anim', NULL),
  (7, 'premium', 'credits', NULL, 500),
  (8, 'premium', 'item', 'frame_cyber_gold', NULL),
  (10, 'premium', 'item', 'badge_legend_diamond_anim', NULL),
  (12, 'premium', 'item', 'border_neon_pulse', NULL),
  (15, 'premium', 'item', 'frame_neon_pulse', NULL),
  (16, 'premium', 'item', 'border_sunforge_gold_anim', NULL),
  (20, 'premium', 'credits', NULL, 1000),
  (25, 'premium', 'item', 'border_royal_gem', NULL);