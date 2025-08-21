import React, { useState } from 'react';
import { ChevronUp, Lock, CheckCircle, Flame, Zap, Target, Trophy } from 'lucide-react';
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
      <div className={`fixed bottom-0 left-0 right-0 z-50 h-16 bg-gradient-to-r from-[#0B0F14]/95 via-[#1A1F2E]/95 to-[#12161C]/95 backdrop-blur-sm border-t border-gradient-to-r from-neon-purple/20 to-neon-cyan/20 ${className}`} 
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="h-6 w-12 bg-gradient-to-r from-neon-purple/20 to-neon-blue/20 rounded animate-pulse"></div>
          <div className="flex-1 h-2 bg-gradient-to-r from-white/10 to-white/5 rounded-full animate-pulse"></div>
          <div className="h-6 w-20 bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 rounded animate-pulse"></div>
          <div className="h-4 w-4 bg-white/10 rounded animate-pulse"></div>
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
          <div className={`fixed bottom-0 left-0 right-0 z-50 h-16 bg-gradient-to-r from-[#0B0F14]/95 via-[#1A1F2E]/95 to-[#12161C]/95 backdrop-blur-md border-t border-gradient-to-r from-neon-purple/30 via-neon-cyan/30 to-neon-blue/30 cursor-pointer transition-all duration-300 hover:from-[#0F1418]/95 hover:via-[#1F2535]/95 hover:to-[#161B20]/95 hover:shadow-[0_-4px_20px_rgba(138,43,226,0.2)] group ${className}`}
               style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="px-4 py-3 flex items-center gap-3">
              {/* Level + Streak */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="relative">
                  <span className="font-gaming text-sm text-[#EAEFFC] tracking-[0.04em] relative z-10">
                    Lv.{level}
                  </span>
                  <div className="absolute -inset-1 bg-gradient-to-r from-neon-purple/20 to-neon-blue/20 rounded blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                {streak_count > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-500/30 via-red-500/30 to-yellow-500/30 border border-orange-400/40 rounded-full shadow-[0_0_8px_rgba(251,146,60,0.3)] animate-pulse">
                    <Flame className="h-3 w-3 text-orange-400 animate-bounce" />
                    <span className="text-xs font-medium text-orange-200">
                      {streak_count}
                    </span>
                  </div>
                )}
              </div>

              {/* XP Meter */}
              <div className="flex-1 min-w-0 relative">
                <div 
                  className="h-2 bg-gradient-to-r from-[#0F1722] via-[#1A1F2E] to-[#0F1722] rounded-full shadow-inner overflow-hidden border border-white/[0.05]"
                  role="progressbar"
                  aria-valuenow={Math.floor(currentLevelXP)}
                  aria-valuemin={0}
                  aria-valuemax={nextXp}
                  aria-label="XP progress"
                >
                  <div 
                    className="h-full bg-gradient-to-r from-neon-blue via-neon-purple to-neon-cyan rounded-full transition-all duration-500 ease-out shadow-[0_0_16px_currentColor,0_0_8px_rgba(138,43,226,0.4)] animate-glow-pulse motion-reduce:transition-none relative overflow-hidden"
                    style={{ 
                      width: `${xpProgress}%`,
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-slide-across" />
                  </div>
                </div>
                {/* XP text overlay on hover */}
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                  {Math.floor(currentLevelXP)}/{nextXp} XP
                </div>
              </div>

              {/* Mission Summary */}
              <div className="flex items-center gap-2 text-xs text-[#EAEFFC] flex-shrink-0">
                <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-neon-purple/20 to-neon-purple/10 border border-neon-purple/30 rounded-full">
                  <Target className="h-3 w-3 text-neon-purple" />
                  <span className="text-neon-purple font-medium">{dailyCompleted}/{dailyTotal}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-neon-cyan/20 to-neon-cyan/10 border border-neon-cyan/30 rounded-full">
                  <Trophy className="h-3 w-3 text-neon-cyan" />
                  <span className="text-neon-cyan font-medium">{weeklyCompleted}/{weeklyTotal}</span>
                </div>
              </div>

              {/* Expand Icon */}
              <div className="flex-shrink-0 relative">
                <ChevronUp className="h-4 w-4 text-white/60 group-hover:text-neon-purple transition-colors duration-200" />
                <div className="absolute -inset-2 bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
              </div>
            </div>
          </div>
        </SheetTrigger>

        <SheetContent 
          side="bottom" 
          className="h-[80vh] bg-gradient-to-br from-[#0B0F14]/98 via-[#1A1F2E]/98 to-[#12161C]/98 backdrop-blur-xl border-t-2 border-gradient-to-r from-neon-purple/40 via-neon-cyan/40 to-neon-blue/40 rounded-t-3xl shadow-[0_-8px_32px_rgba(138,43,226,0.3)]"
        >
          <div className="p-6 space-y-6 h-full overflow-y-auto">
            {/* Drag Handle */}
            <div className="flex justify-center mb-2">
              <div className="w-12 h-1 bg-gradient-to-r from-neon-purple to-neon-cyan rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="font-gaming text-3xl text-transparent bg-gradient-to-r from-neon-blue via-neon-purple to-neon-cyan bg-clip-text tracking-[0.04em]">
                    Level {level}
                  </span>
                  <div className="absolute -inset-2 bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20 rounded-lg blur opacity-50" />
                </div>
                {streak_count > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/30 via-red-500/30 to-yellow-500/30 border-2 border-orange-400/50 rounded-2xl shadow-[0_0_16px_rgba(251,146,60,0.4)] animate-pulse-glow">
                    <Flame className="h-5 w-5 text-orange-400 animate-flicker" />
                    <span className="text-base font-bold text-orange-200">
                      {streak_count} day streak!
                    </span>
                    <Zap className="h-4 w-4 text-yellow-400 animate-bounce" />
                  </div>
                )}
              </div>
            </div>

            {/* XP Progress */}
            <div className="space-y-4 p-4 bg-gradient-to-r from-white/[0.03] via-white/[0.05] to-white/[0.03] border border-white/[0.08] rounded-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#CFE3FF] font-semibold text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-neon-cyan" />
                  Experience Points
                </span>
                <span className="text-base text-neon-purple font-bold px-3 py-1 bg-neon-purple/20 rounded-full border border-neon-purple/30">
                  {Math.floor(currentLevelXP)}/{nextXp} XP
                </span>
              </div>
              <div 
                className="h-6 bg-gradient-to-r from-[#0F1722] via-[#1A1F2E] to-[#0F1722] rounded-full shadow-inner overflow-hidden border border-white/[0.08] relative"
                role="progressbar"
                aria-valuenow={Math.floor(currentLevelXP)}
                aria-valuemin={0}
                aria-valuemax={nextXp}
                aria-label="XP progress"
              >
                <div 
                  className="h-full bg-gradient-to-r from-neon-blue via-neon-purple via-neon-cyan to-neon-blue rounded-full transition-all duration-700 ease-out shadow-[0_0_24px_currentColor,0_0_12px_rgba(138,43,226,0.6)] motion-reduce:transition-none relative overflow-hidden"
                  style={{ 
                    width: `${xpProgress}%`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-slide-across" />
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10" />
                </div>
                {/* Progress percentage indicator */}
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-medium text-white/80">
                  {Math.round(xpProgress)}%
                </div>
              </div>
            </div>

            {/* Mission Progress */}
            <div className="space-y-4">
              <h3 className="text-[#CFE3FF] font-semibold text-xl flex items-center gap-2">
                <Target className="h-6 w-6 text-neon-purple" />
                Mission Progress
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-gradient-to-br from-neon-purple/15 via-neon-purple/10 to-neon-purple/5 border-2 border-neon-purple/30 rounded-2xl shadow-[0_0_20px_rgba(138,43,226,0.2)] hover:shadow-[0_0_32px_rgba(138,43,226,0.3)] transition-all duration-300 group">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4 text-neon-purple group-hover:animate-spin" />
                    <div className="text-xs uppercase text-[#EAEFFC] font-bold tracking-wider">
                      Daily Missions
                    </div>
                  </div>
                  <div className="text-2xl text-white font-bold mb-3 flex items-center gap-2">
                    {dailyCompleted}/{dailyTotal}
                    {dailyCompleted === dailyTotal && dailyTotal > 0 && (
                      <CheckCircle className="h-5 w-5 text-green-400 animate-bounce" />
                    )}
                  </div>
                  <div className="h-2 bg-[#0F1722] rounded-full overflow-hidden border border-neon-purple/20">
                    <div 
                      className="h-full bg-gradient-to-r from-neon-purple to-pink-500 rounded-full transition-all duration-500 shadow-[0_0_8px_currentColor]"
                      style={{ width: `${dailyTotal > 0 ? (dailyCompleted / dailyTotal) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="p-5 bg-gradient-to-br from-neon-cyan/15 via-neon-cyan/10 to-neon-cyan/5 border-2 border-neon-cyan/30 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_32px_rgba(6,182,212,0.3)] transition-all duration-300 group">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="h-4 w-4 text-neon-cyan group-hover:animate-bounce" />
                    <div className="text-xs uppercase text-[#EAEFFC] font-bold tracking-wider">
                      Weekly Missions
                    </div>
                  </div>
                  <div className="text-2xl text-white font-bold mb-3 flex items-center gap-2">
                    {weeklyCompleted}/{weeklyTotal}
                    {weeklyCompleted === weeklyTotal && weeklyTotal > 0 && (
                      <CheckCircle className="h-5 w-5 text-green-400 animate-bounce" />
                    )}
                  </div>
                  <div className="h-2 bg-[#0F1722] rounded-full overflow-hidden border border-neon-cyan/20">
                    <div 
                      className="h-full bg-gradient-to-r from-neon-cyan to-blue-400 rounded-full transition-all duration-500 shadow-[0_0_8px_currentColor]"
                      style={{ width: `${weeklyTotal > 0 ? (weeklyCompleted / weeklyTotal) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Next Reward */}
            <div className="space-y-4">
              <h3 className="text-[#CFE3FF] font-semibold text-xl flex items-center gap-2">
                <Trophy className="h-6 w-6 text-golden" />
                Next Reward
              </h3>
              <div className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 ${
                isNextRewardLocked 
                  ? 'bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-orange-500/5 border-golden/40 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                  : 'bg-gradient-to-br from-white/[0.08] via-white/[0.06] to-white/[0.04] border-white/[0.12] shadow-[0_0_20px_rgba(255,255,255,0.1)]'
              }`}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`p-3 rounded-xl ${
                    isNextRewardLocked 
                      ? 'bg-golden/20 border border-golden/40' 
                      : 'bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 border border-neon-purple/40'
                  }`}>
                    {isNextRewardLocked ? (
                      <Lock className="h-6 w-6 text-golden animate-pulse" />
                    ) : nextReward ? (
                      <Trophy className="h-6 w-6 text-neon-purple" />
                    ) : (
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className={`text-xl font-bold block truncate ${
                      isNextRewardLocked 
                        ? 'text-golden' 
                        : 'text-transparent bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text'
                    }`}>
                      {nextRewardLabel}
                    </span>
                    {isNextRewardLocked && (
                      <span className="text-sm text-amber-300/80 block mt-1">
                        Unlock Premium to claim
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {isNextRewardLocked && (
                    <div className="px-4 py-2 bg-gradient-to-r from-golden/20 to-amber-500/20 border border-golden/40 rounded-xl">
                      <span className="text-golden font-medium text-sm">Premium</span>
                    </div>
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