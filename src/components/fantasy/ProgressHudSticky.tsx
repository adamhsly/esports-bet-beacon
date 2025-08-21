import React, { useState } from 'react';
import { ChevronUp, Lock, CheckCircle, Flame } from 'lucide-react';
import { useProgress, useMissions, useRewards, useEntitlement } from '@/hooks/useSupabaseData';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface ProgressHudStickyProps {
  className?: string;
}

export const ProgressHudSticky: React.FC<ProgressHudStickyProps> = ({ className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { level, xp, streak_count, loading: progressLoading } = useProgress();
  const { dailyMissions, weeklyMissions, loading: missionsLoading } = useMissions();
  const { freeRewards, premiumRewards, loading: rewardsLoading } = useRewards();
  const { premiumActive, loading: entitlementLoading } = useEntitlement();

  const loading = progressLoading || missionsLoading || rewardsLoading || entitlementLoading;

  if (loading) {
    return (
      <div className={`fixed bottom-0 left-0 right-0 z-50 h-16 bg-gradient-to-r from-[#0B0F14] to-[#12161C] border-t border-white/[0.08] animate-pulse ${className}`} 
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="h-6 w-12 bg-white/10 rounded"></div>
          <div className="flex-1 h-2 bg-white/10 rounded-full"></div>
          <div className="h-6 w-20 bg-white/10 rounded"></div>
          <div className="h-4 w-4 bg-white/10 rounded"></div>
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
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <div className={`fixed bottom-0 left-0 right-0 z-50 h-16 bg-gradient-to-r from-[#0B0F14] to-[#12161C] border-t border-white/[0.08] cursor-pointer transition-all duration-200 hover:border-white/[0.12] ${className}`}
               style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="px-4 py-3 flex items-center gap-3">
              {/* Level + Streak */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-gaming text-sm text-[#EAEFFC] tracking-[0.04em]">
                  Lv.{level}
                </span>
                {streak_count > 0 && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/30 rounded-full">
                    <Flame className="h-2.5 w-2.5 text-orange-400" />
                    <span className="text-xs font-medium text-orange-300">
                      {streak_count}
                    </span>
                  </div>
                )}
              </div>

              {/* XP Meter */}
              <div className="flex-1 min-w-0">
                <div 
                  className="h-2 bg-[#0F1722] rounded-full shadow-inner overflow-hidden"
                  role="progressbar"
                  aria-valuenow={Math.floor(currentLevelXP)}
                  aria-valuemin={0}
                  aria-valuemax={nextXp}
                  aria-label="XP progress"
                >
                  <div 
                    className="h-full bg-gradient-to-r from-neon-blue to-neon-purple rounded-full transition-all duration-200 ease-out shadow-[0_0_12px_currentColor] motion-reduce:transition-none"
                    style={{ 
                      width: `${xpProgress}%`,
                      filter: 'drop-shadow(0 0 6px currentColor)'
                    }}
                  />
                </div>
              </div>

              {/* Mission Summary */}
              <div className="flex items-center gap-1 text-xs text-[#EAEFFC] flex-shrink-0">
                <span className="text-neon-purple">{dailyCompleted}/{dailyTotal}</span>
                <span className="text-white/40">•</span>
                <span className="text-neon-cyan">{weeklyCompleted}/{weeklyTotal}</span>
              </div>

              {/* Expand Icon */}
              <ChevronUp className="h-4 w-4 text-white/60 flex-shrink-0" />
            </div>
          </div>
        </SheetTrigger>

        <SheetContent 
          side="bottom" 
          className="h-[80vh] bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-t border-white/[0.08] rounded-t-2xl"
        >
          <div className="p-6 space-y-6 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-gaming text-2xl text-[#CFE3FF] tracking-[0.04em]">
                  Level {level}
                </span>
                {streak_count > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/30 rounded-full animate-pulse-glow">
                    <Flame className="h-4 w-4 text-orange-400" />
                    <span className="text-sm font-medium text-orange-300">
                      {streak_count} day streak
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* XP Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#CFE3FF] font-medium">Experience Points</span>
                <span className="text-sm text-muted-foreground font-medium">
                  {Math.floor(currentLevelXP)}/{nextXp} XP
                </span>
              </div>
              <div 
                className="h-4 bg-[#0F1722] rounded-full shadow-inner overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.floor(currentLevelXP)}
                aria-valuemin={0}
                aria-valuemax={nextXp}
                aria-label="XP progress"
              >
                <div 
                  className="h-full bg-gradient-to-r from-neon-blue to-neon-purple rounded-full transition-all duration-300 ease-out shadow-[0_0_20px_currentColor] motion-reduce:transition-none"
                  style={{ 
                    width: `${xpProgress}%`,
                    filter: 'drop-shadow(0 0 10px currentColor)'
                  }}
                />
              </div>
            </div>

            {/* Mission Progress */}
            <div className="space-y-3">
              <h3 className="text-[#CFE3FF] font-medium">Mission Progress</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-gradient-to-r from-neon-purple/10 to-neon-purple/5 border border-neon-purple/20 rounded-xl">
                  <div className="text-xs uppercase text-[#EAEFFC] font-medium tracking-wide mb-1">
                    Daily Missions
                  </div>
                  <div className="text-lg text-white font-semibold">
                    {dailyCompleted}/{dailyTotal}
                  </div>
                  <div className="mt-2 h-1.5 bg-[#0F1722] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-neon-purple rounded-full transition-all duration-300"
                      style={{ width: `${dailyTotal > 0 ? (dailyCompleted / dailyTotal) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-r from-neon-cyan/10 to-neon-cyan/5 border border-neon-cyan/20 rounded-xl">
                  <div className="text-xs uppercase text-[#EAEFFC] font-medium tracking-wide mb-1">
                    Weekly Missions
                  </div>
                  <div className="text-lg text-white font-semibold">
                    {weeklyCompleted}/{weeklyTotal}
                  </div>
                  <div className="mt-2 h-1.5 bg-[#0F1722] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-neon-cyan rounded-full transition-all duration-300"
                      style={{ width: `${weeklyTotal > 0 ? (weeklyCompleted / weeklyTotal) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Next Reward */}
            <div className="space-y-3">
              <h3 className="text-[#CFE3FF] font-medium">Next Reward</h3>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/[0.08] rounded-xl">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={`text-lg font-medium truncate ${
                    isNextRewardLocked 
                      ? 'text-golden animate-pulse-subtle' 
                      : 'text-[#CFE3FF]'
                  }`}>
                    {nextRewardLabel}
                  </span>
                </div>
                <div className="flex-shrink-0">
                  {isNextRewardLocked ? (
                    <Lock className="h-5 w-5 text-golden animate-pulse-subtle" />
                  ) : nextReward ? (
                    <div className="h-5 w-5 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bottom spacer for content */}
      <div className="h-16" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
    </>
  );
};