import React from 'react';
import { Lock, CheckCircle, Flame } from 'lucide-react';
import { useProgress, useMissions, useRewards, useEntitlement } from '@/hooks/useSupabaseData';
interface ProgressHudSidebarProps {
  className?: string;
}
export const ProgressHudSidebar: React.FC<ProgressHudSidebarProps> = ({
  className = ""
}) => {
  const {
    level,
    xp,
    streak_count,
    loading: progressLoading
  } = useProgress();
  const {
    dailyMissions,
    weeklyMissions,
    loading: missionsLoading
  } = useMissions();
  const {
    freeRewards,
    premiumRewards,
    loading: rewardsLoading
  } = useRewards();
  const {
    premiumActive,
    loading: entitlementLoading
  } = useEntitlement();
  const loading = progressLoading || missionsLoading || rewardsLoading || entitlementLoading;
  if (loading) {
    return <div className={`bg-gradient-to-br from-[#0B0F14] to-[#12161C] border border-white/[0.08] rounded-2xl p-4 animate-pulse max-w-[340px] ${className}`}>
        <div className="space-y-4">
          <div className="h-6 bg-white/10 rounded-lg"></div>
          <div className="h-3 bg-white/10 rounded-full"></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 bg-white/10 rounded-xl"></div>
            <div className="h-16 bg-white/10 rounded-xl"></div>
          </div>
          <div className="h-12 bg-white/10 rounded-xl"></div>
        </div>
      </div>;
  }

  // Calculate XP for next level
  const baseXPForLevel = 1000 + level * 100;
  const currentLevelStart = level === 1 ? 0 : (level - 1) * 1000 + (level - 1) * (level - 2) / 2 * 100;
  const currentLevelXP = xp - currentLevelStart;
  const nextXp = baseXPForLevel;
  const xpProgress = Math.min(currentLevelXP / nextXp * 100, 100);

  // Mission counts
  const dailyCompleted = dailyMissions.filter(m => m.completed).length;
  const dailyTotal = dailyMissions.length;
  const weeklyCompleted = weeklyMissions.filter(m => m.completed).length;
  const weeklyTotal = weeklyMissions.length;

  // Next reward
  const nextReward = premiumActive ? premiumRewards.find(r => !r.unlocked && r.level_required > level) : freeRewards.find(r => !r.unlocked && r.level_required > level);
  const nextPremiumReward = !premiumActive ? premiumRewards.find(r => !r.unlocked && r.level_required > level) : null;
  const isNextRewardLocked = nextPremiumReward && !premiumActive;
  const nextRewardLabel = nextReward?.reward_type || nextPremiumReward?.reward_type || "Max Level";
  return;
};