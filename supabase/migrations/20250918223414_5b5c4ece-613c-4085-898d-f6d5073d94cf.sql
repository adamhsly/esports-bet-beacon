-- Performance optimization indexes
-- Add strategic indexes for frequently queried columns

-- Index for missions table queries
CREATE INDEX IF NOT EXISTS idx_missions_active_kind ON public.missions (active, kind);
CREATE INDEX IF NOT EXISTS idx_missions_code ON public.missions (code) WHERE active = true;

-- Index for user_missions queries
CREATE INDEX IF NOT EXISTS idx_user_missions_user_mission ON public.user_missions (user_id, mission_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_reset_at ON public.user_missions (reset_at);

-- Index for user_progress queries
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress (user_id);

-- Index for profiles premium queries
CREATE INDEX IF NOT EXISTS idx_profiles_premium_pass ON public.profiles (premium_pass);

-- Index for season_rewards queries
CREATE INDEX IF NOT EXISTS idx_season_rewards_season_tier ON public.season_rewards (season_id, tier);
CREATE INDEX IF NOT EXISTS idx_season_rewards_level ON public.season_rewards (level_required);

-- Index for user_rewards queries
CREATE INDEX IF NOT EXISTS idx_user_rewards_user_reward ON public.user_rewards (user_id, reward_id);

-- Index for faceit_matches performance
CREATE INDEX IF NOT EXISTS idx_faceit_matches_status ON public.faceit_matches (status);
CREATE INDEX IF NOT EXISTS idx_faceit_matches_last_update ON public.faceit_matches (last_live_update);

-- Index for seasons queries
CREATE INDEX IF NOT EXISTS idx_seasons_date_range ON public.seasons (starts_at, ends_at);