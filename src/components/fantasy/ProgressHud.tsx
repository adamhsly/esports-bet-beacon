import React from 'react';
import { Lock, CheckCircle, Flame } from 'lucide-react';
import { useProgress, useMissions, useRewards, useEntitlement } from '@/hooks/useSupabaseData';

interface ProgressHudProps {
  className?: string;
}

export const ProgressHud: React.FC<ProgressHudProps> = ({ className = "" }) => {
  const { level, xp, streak_count, loading: progressLoading } = useProgress();
  const { dailyMissions, weeklyMissions, loading: missionsLoading } = useMissions();
  const { freeRewards, premiumRewards, loading: rewardsLoading } = useRewards();
  const { premiumActive, loading: entitlementLoading } = useEntitlement();

  const loading = progressLoading || missionsLoading || rewardsLoading || entitlementLoading;

  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-[#0B0F14] to-[#12161C] border border-white/[0.08] rounded-2xl p-4 animate-pulse ${className}`}>
        <div className="space-y-3">
          <div className="h-6 bg-white/10 rounded-lg"></div>
          <div className="h-3 bg-white/10 rounded-full"></div>
          <div className="flex gap-2">
            <div className="h-8 flex-1 bg-white/10 rounded-lg"></div>
            <div className="h-8 flex-1 bg-white/10 rounded-lg"></div>
          </div>
          <div className="h-5 bg-white/10 rounded-lg"></div>
        </div>
      </div>
    );
  }

  // Calculate XP for next level (1000 base + level * 100)
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
    <div className={`bg-gradient-to-br from-[#0B0F14] to-[#12161C] border border-white/[0.08] rounded-2xl p-4 space-y-3 shadow-2xl ${className}`}>
      {/* Row 1: Level and XP */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-gaming text-lg text-[#CFE3FF] tracking-[0.04em]">
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

      {/* Row 2: XP Meter */}
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
            className="h-full bg-gradient-to-r from-neon-blue to-neon-purple rounded-full transition-all duration-[220ms] ease-out shadow-[0_0_18px_currentColor] motion-reduce:transition-none"
            style={{ 
              width: `${xpProgress}%`,
              filter: 'drop-shadow(0 0 8px currentColor)'
            }}
          />
        </div>
      </div>

      {/* Row 3: Mission Chips */}
      <div className="flex gap-2">
        <div className="flex-1 min-h-[32px] px-3 py-1.5 bg-gradient-to-r from-neon-purple/10 to-neon-purple/5 border border-neon-purple/20 rounded-lg hover:border-neon-purple/40 transition-colors">
          <div className="text-xs uppercase text-neon-purple font-medium tracking-wide">
            Daily
          </div>
          <div className="text-sm text-white font-semibold">
            {dailyCompleted}/{dailyTotal}
          </div>
        </div>
        <div className="flex-1 min-h-[32px] px-3 py-1.5 bg-gradient-to-r from-neon-cyan/10 to-neon-cyan/5 border border-neon-cyan/20 rounded-lg hover:border-neon-cyan/40 transition-colors">
          <div className="text-xs uppercase text-neon-cyan font-medium tracking-wide">
            Weekly
          </div>
          <div className="text-sm text-white font-semibold">
            {weeklyCompleted}/{weeklyTotal}
          </div>
        </div>
      </div>

      {/* Row 4: Next Reward */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            Next:
          </span>
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
  );
};