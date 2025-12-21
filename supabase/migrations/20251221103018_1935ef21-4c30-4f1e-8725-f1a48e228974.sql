-- =============================================
-- DISK IO OPTIMIZATION - INDEXES ONLY
-- =============================================

-- 1. Optimize active_season_id() function lookups
CREATE INDEX IF NOT EXISTS idx_seasons_dates ON public.seasons(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_seasons_active_lookup ON public.seasons(starts_at DESC, ends_at);

-- 2. Optimize season_rewards lookups
CREATE INDEX IF NOT EXISTS idx_season_rewards_season_level ON public.season_rewards(season_id, level_required);

-- 3. Optimize match_notifications user lookups
CREATE INDEX IF NOT EXISTS idx_match_notifications_user ON public.match_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_match_notifications_user_match ON public.match_notifications(user_id, match_id);

-- 4. Optimize xp_rules kind lookups (called frequently by award_xp function)
CREATE INDEX IF NOT EXISTS idx_xp_rules_kind ON public.xp_rules(kind);

-- 5. Optimize level_rewards level lookups
CREATE INDEX IF NOT EXISTS idx_level_rewards_level ON public.level_rewards(level);
CREATE INDEX IF NOT EXISTS idx_level_rewards_track_level ON public.level_rewards(track, level);

-- 6. Add indexes for fantasy scoring queries
CREATE INDEX IF NOT EXISTS idx_fantasy_round_scores_round_user ON public.fantasy_round_scores(round_id, user_id);
CREATE INDEX IF NOT EXISTS idx_fantasy_round_picks_round_user ON public.fantasy_round_picks(round_id, user_id);

-- 7. Cleanup old audit records (keep last 30 days)
DELETE FROM public.fantasy_team_prices_audit 
WHERE changed_at < NOW() - INTERVAL '30 days';