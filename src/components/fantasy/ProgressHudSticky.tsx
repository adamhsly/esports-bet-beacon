// Progress HUD component for sticky display
import React from 'react';
import { ChevronUp, Flame } from 'lucide-react';
import { useProgress, useMissions, useRewards, useEntitlement } from '@/hooks/useSupabaseData';
import { useProfilePanel } from '@/components/ProfileSheet';

interface ProgressHudStickyProps {
  className?: string;
}

export const ProgressHudSticky: React.FC<ProgressHudStickyProps> = ({ className = "" }) => {
  const { openProfile } = useProfilePanel();
  const { level, xp, streak_count, loading: progressLoading } = useProgress();
  const { dailyMissions, weeklyMissions, loading: missionsLoading } = useMissions();
  const { freeRewards, premiumRewards, loading: rewardsLoading } = useRewards();
  const { premiumActive, loading: entitlementLoading } = useEntitlement();

  const loading = progressLoading || missionsLoading || rewardsLoading || entitlementLoading;

  if (loading) {
    return (
      <div className={`fixed bottom-0 left-0 right-0 z-50 h-16 bg-[#0d0d0f] border-t border-[rgba(255,215,0,0.35)] animate-pulse ${className}`} 
           style={{ paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: 'inset 0 2px 8px rgba(255,215,0,0.15), 0 -4px 16px rgba(255,215,0,0.2)' }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="h-6 w-12 bg-white/10 rounded"></div>
          <div className="flex-1 h-2 bg-white/10 rounded-full"></div>
          <div className="h-6 w-20 bg-white/10 rounded"></div>
          <div className="h-4 w-4 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  // Calculate XP for next level (matches share card formula)
  const nextXp = Math.pow(level + 1, 2) * 100;
  const xpProgress = Math.min((xp / nextXp) * 100, 100);

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
      <div 
        className={`fixed bottom-0 left-0 right-0 z-50 h-16 bg-[#0d0d0f] border-t border-[rgba(255,215,0,0.35)] cursor-pointer transition-all duration-200 hover:border-[rgba(255,215,0,0.5)] ${className}`}
        style={{ 
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: 'inset 0 2px 8px rgba(255,215,0,0.15), 0 -4px 16px rgba(255,215,0,0.2)'
        }}
        onClick={openProfile}
      >
        <div className="px-4 py-3 flex items-center gap-3">
          {/* Level + Streak */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="font-gaming text-sm text-[#f6e7b1] tracking-[0.04em] font-semibold">
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
              className="h-2 bg-black/40 rounded-full shadow-inner overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.floor(xp)}
              aria-valuemin={0}
              aria-valuemax={nextXp}
              aria-label="XP progress"
            >
              <div 
                className="h-full bg-gradient-to-r from-[#FFCC33] to-[#FF9900] rounded-full transition-all duration-200 ease-out"
                style={{ 
                  width: `${xpProgress}%`,
                  boxShadow: '0 0 8px rgba(255,204,51,0.6), 0 0 12px rgba(255,153,0,0.4)'
                }}
              />
            </div>
          </div>

          {/* Mission Summary */}
          <div className="flex items-center gap-1 text-xs text-[#f6e7b1] font-semibold flex-shrink-0">
            <span className="text-[#FFCC33]">{dailyCompleted}/{dailyTotal}</span>
            <span className="text-white/40">•</span>
            <span className="text-[#FF9900]">{weeklyCompleted}/{weeklyTotal}</span>
          </div>

          {/* Expand Icon */}
          <ChevronUp className="h-4 w-4 text-[#f6e7b1]/60 flex-shrink-0" />
        </div>
      </div>

      {/* Bottom spacer for content */}
      <div className="h-16" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
    </>
  );
};