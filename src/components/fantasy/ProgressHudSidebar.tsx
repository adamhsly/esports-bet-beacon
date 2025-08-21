import React from 'react';
import { Lock, CheckCircle, Flame } from 'lucide-react';
import { useProgress, useMissions, useRewards, useEntitlement } from '@/hooks/useSupabaseData';

interface ProgressHudSidebarProps {
  className?: string;
}

export const ProgressHudSidebar: React.FC<ProgressHudSidebarProps> = ({ className = "" }) => {
  const { level, xp, streak_count, loading: progressLoading } = useProgress();
  const { dailyMissions, weeklyMissions, loading: missionsLoading } = useMissions();
  const { freeRewards, premiumRewards, loading: rewardsLoading } = useRewards();
  const { premiumActive, loading: entitlementLoading } = useEntitlement();

  const loading = progressLoading || missionsLoading || rewardsLoading || entitlementLoading;

  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-[#0B0F14] to-[#12161C] border border-white/[0.08] rounded-2xl p-4 animate-pulse max-w-[340px] ${className}`}>
        <div className="space-y-4">
          <div className="h-6 bg-white/10 rounded-lg"></div>
          <div className="h-3 bg-white/10 rounded-full"></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 bg-white/10 rounded-xl"></div>
            <div className="h-16 bg-white/10 rounded-xl"></div>
          </div>
          <div className="h-12 bg-white/10 rounded-xl"></div>
        </div>
      </div>
    );
  }

  // Calculate XP for next level
  const baseXPForLevel = 1000 + level * 100;
  const currentLevelStart = level === 1 ? 0 : (level - 1) * 1000 + ((level - 1) * (level - 2) / 2) * 100;
  const currentLevelXP = xp - currentLevelStart;
  const nextXp = baseXPForLevel;
  const xpProgress = Math.min((currentLevelXP / nextXp) * 100, 100);

  // Mission counts
  const dailyCompleted = dailyMissions.filter(m => m.completed).length;
  const dailyTotal = dailyMissions.length;
  const weeklyCompleted = weeklyMissions.filter(m => m.completed).length;
  const weeklyTotal = weeklyMissions.length;

  // Next reward
  const nextReward = premiumActive 
    ? premiumRewards.find(r => !r.unlocked && r.level_required > level)
    : freeRewards.find(r => !r.unlocked && r.level_required > level);
  
  const nextPremiumReward = !premiumActive 
    ? premiumRewards.find(r => !r.unlocked && r.level_required > level)
    : null;

  const isNextRewardLocked = nextPremiumReward && !premiumActive;
  const nextRewardLabel = nextReward?.reward_type || nextPremiumReward?.reward_type || "Max Level";

  return (
    <div className={`bg-gradient-to-br from-[#0B0F14] to-[#12161C] border border-white/[0.08] rounded-2xl p-4 space-y-4 shadow-2xl max-w-[340px] ${className}`}>
      {/* Level and XP Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-gaming text-xl text-[#CFE3FF] tracking-[0.04em]">
              Lv.{level}
            </span>
            {streak_count > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/30 rounded-full animate-pulse-glow">
                <Flame className="h-3 w-3 text-orange-400" />
                <span className="text-xs font-medium text-orange-300">
                  {streak_count}
                </span>
              </div>
            )}
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            {Math.floor(currentLevelXP)}/{nextXp} XP
          </div>
        </div>

        {/* XP Meter */}
        <div className="relative">
          <div 
            className="h-3 bg-[#0F1722] rounded-full shadow-inner overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.floor(currentLevelXP)}
            aria-valuemin={0}
            aria-valuemax={nextXp}
            aria-label="XP progress"
          >
            <div 
              className="h-full bg-gradient-to-r from-neon-blue to-neon-purple rounded-full transition-all duration-300 ease-out shadow-[0_0_18px_currentColor] motion-reduce:transition-none"
              style={{ 
                width: `${xpProgress}%`,
                filter: 'drop-shadow(0 0 8px currentColor)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Mission Progress */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-[#CFE3FF] uppercase tracking-wide">Missions</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gradient-to-r from-neon-purple/10 to-neon-purple/5 border border-neon-purple/20 rounded-xl hover:border-neon-purple/40 transition-colors">
            <div className="text-xs uppercase text-neon-purple font-medium tracking-wide mb-1">
              Daily
            </div>
            <div className="text-sm text-white font-semibold mb-2">
              {dailyCompleted}/{dailyTotal}
            </div>
            <div className="h-1.5 bg-[#0F1722] rounded-full overflow-hidden">
              <div 
                className="h-full bg-neon-purple rounded-full transition-all duration-300"
                style={{ width: `${dailyTotal > 0 ? (dailyCompleted / dailyTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="p-3 bg-gradient-to-r from-neon-cyan/10 to-neon-cyan/5 border border-neon-cyan/20 rounded-xl hover:border-neon-cyan/40 transition-colors">
            <div className="text-xs uppercase text-neon-cyan font-medium tracking-wide mb-1">
              Weekly
            </div>
            <div className="text-sm text-white font-semibold mb-2">
              {weeklyCompleted}/{weeklyTotal}
            </div>
            <div className="h-1.5 bg-[#0F1722] rounded-full overflow-hidden">
              <div 
                className="h-full bg-neon-cyan rounded-full transition-all duration-300"
                style={{ width: `${weeklyTotal > 0 ? (weeklyCompleted / weeklyTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Next Reward */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-[#CFE3FF] uppercase tracking-wide">Next Reward</h3>
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/[0.08] rounded-xl">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`text-sm font-medium truncate ${
              isNextRewardLocked 
                ? 'text-golden animate-pulse-subtle' 
                : 'text-[#CFE3FF]'
            }`}>
              {nextRewardLabel}
            </span>
          </div>
          <div className="flex-shrink-0">
            {isNextRewardLocked ? (
              <Lock className="h-4 w-4 text-golden animate-pulse-subtle" />
            ) : nextReward ? (
              <div className="h-4 w-4 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};