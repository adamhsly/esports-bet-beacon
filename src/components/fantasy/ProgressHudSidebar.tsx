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
    return <div className={`bg-[#0d0d0f] border border-[rgba(255,215,0,0.35)] rounded-2xl p-4 animate-pulse max-w-[340px] ${className}`}
           style={{ boxShadow: 'inset 0 0 12px rgba(255,215,0,0.1), 0 4px 20px rgba(255,215,0,0.25)' }}>
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

  // Calculate XP for next level (matches profile page and mobile)
  const nextXp = Math.pow(level + 1, 2) * 100;
  const xpProgress = Math.min((xp / nextXp) * 100, 100);

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
  
  return (
    <div className={`bg-[#0d0d0f] border border-[rgba(255,215,0,0.35)] rounded-2xl p-4 space-y-3 max-w-[340px] ${className}`}
         style={{ boxShadow: 'inset 0 0 12px rgba(255,215,0,0.1), 0 4px 20px rgba(255,215,0,0.25)' }}>
      {/* Row 1: Level and XP */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-gaming text-lg text-[#f6e7b1] tracking-[0.04em] font-semibold">
            Lv.{level}
          </span>
          {streak_count > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/30 rounded-full">
              <Flame className="h-3 w-3 text-orange-400" />
              <span className="text-xs font-medium text-orange-300">
                {streak_count}
              </span>
            </div>
          )}
        </div>
        <div className="text-sm text-white font-gaming">
          {xp}/{nextXp} XP
        </div>
      </div>

      {/* Row 2: XP Meter */}
      <div className="relative">
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

      {/* Row 3: Mission Chips */}
      <div className="flex gap-2">
        <div className="flex-1 min-h-[32px] px-3 py-1.5 bg-gradient-to-r from-[#FFCC33]/10 to-[#FFCC33]/5 border border-[#FFCC33]/20 rounded-lg hover:border-[#FFCC33]/40 transition-colors">
          <div className="text-xs uppercase text-[#FFCC33] font-medium tracking-wide">
            Daily
          </div>
          <div className="text-sm text-[#f6e7b1] font-semibold">
            {dailyCompleted}/{dailyTotal}
          </div>
        </div>
        <div className="flex-1 min-h-[32px] px-3 py-1.5 bg-gradient-to-r from-[#FF9900]/10 to-[#FF9900]/5 border border-[#FF9900]/20 rounded-lg hover:border-[#FF9900]/40 transition-colors">
          <div className="text-xs uppercase text-[#FF9900] font-medium tracking-wide">
            Weekly
          </div>
          <div className="text-sm text-[#f6e7b1] font-semibold">
            {weeklyCompleted}/{weeklyTotal}
          </div>
        </div>
      </div>

      {/* Row 4: Next Reward */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-[#f6e7b1]/60 uppercase tracking-wide">
            Next:
          </span>
          <span className={`text-sm font-medium truncate ${
            isNextRewardLocked 
              ? 'text-[#FFCC33] animate-pulse' 
              : 'text-[#f6e7b1]'
          }`}>
            {nextRewardLabel}
          </span>
        </div>
        <div className="flex-shrink-0">
          {isNextRewardLocked ? (
            <Lock className="h-4 w-4 text-[#FFCC33] animate-pulse" />
          ) : nextReward ? (
            <div className="h-4 w-4 bg-gradient-to-r from-[#FFCC33] to-[#FF9900] rounded-full" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-400" />
          )}
        </div>
      </div>
    </div>
  );
};