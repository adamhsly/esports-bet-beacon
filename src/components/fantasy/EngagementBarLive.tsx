import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ChevronRight, 
  ChevronLeft, 
  ChevronUp, 
  ChevronDown, 
  Trophy, 
  Target, 
  Flame, 
  Star,
  Lock,
  Gift,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useProgress, useMissions, useRewards, useEntitlement } from '@/hooks/useSupabaseData';
import { useRPCActions } from '@/hooks/useRPCActions';

export const EngagementBarLive: React.FC = () => {
  const { isAuthenticated } = useAuthUser();
  const { xp, level, streak_count, loading: progressLoading } = useProgress();
  const { dailyMissions, weeklyMissions, loading: missionsLoading } = useMissions();
  const { freeRewards, premiumRewards, loading: rewardsLoading } = useRewards();
  const { premiumActive, loading: entitlementLoading } = useEntitlement();
  const { progressMission } = useRPCActions();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasLoggedInToday, setHasLoggedInToday] = useState(false);

  // Handle daily login mission
  useEffect(() => {
    const handleDailyLogin = async () => {
      if (!isAuthenticated) return;
      
      const today = new Date().toDateString();
      const lastLogin = localStorage.getItem('lastDailyLogin');
      
      if (lastLogin !== today) {
        try {
          await progressMission('daily_login', 1);
          localStorage.setItem('lastDailyLogin', today);
          setHasLoggedInToday(true);
        } catch (error) {
          console.error('Error recording daily login:', error);
        }
      }
    };

    handleDailyLogin();
  }, [isAuthenticated, progressMission]);

  if (!isAuthenticated) {
    return null; // Don't show for unauthenticated users
  }

  const loading = progressLoading || missionsLoading || rewardsLoading || entitlementLoading;

  if (loading) {
    return (
      <div className="fixed bottom-4 right-4 md:top-1/2 md:bottom-auto md:-translate-y-1/2 z-50">
        <Card className="bg-gradient-to-br from-engagement-bg-start to-engagement-bg-end border-engagement-border w-80 mr-4 backdrop-blur-sm shadow-2xl">
          <CardContent className="p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-2 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedDailyMissions = dailyMissions.filter(m => m.completed).length;
  const completedWeeklyMissions = weeklyMissions.filter(m => m.completed).length;
  const dailyProgress = dailyMissions.length > 0 ? (completedDailyMissions / dailyMissions.length) * 100 : 0;
  const weeklyProgress = weeklyMissions.length > 0 ? (completedWeeklyMissions / weeklyMissions.length) * 100 : 0;
  
  // Calculate XP progress (assume each level needs 1000 XP base + level * 100)
  const baseXPForLevel = 1000 + (level - 1) * 100;
  const currentLevelXP = xp - ((level - 1) * 1000 + ((level - 1) * (level - 2) / 2) * 100);
  const xpProgress = Math.min((currentLevelXP / baseXPForLevel) * 100, 100);
  const xpToNext = Math.max(baseXPForLevel - currentLevelXP, 0);

  // Find next rewards
  const nextFreeReward = freeRewards.find(r => !r.unlocked && r.level_required > level);
  const nextPremiumReward = premiumRewards.find(r => !r.unlocked && r.level_required > level);

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 md:top-1/2 md:bottom-auto md:-translate-y-1/2 z-50 animate-slide-right">
        <Button
          onClick={() => setIsMinimized(false)}
          size="sm"
          className="rounded-full bg-gradient-to-r from-neon-purple to-neon-blue text-white shadow-lg animate-neon-pulse"
        >
          <Trophy className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Layout */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-engagement-bg-start to-engagement-bg-end border-t border-engagement-border backdrop-blur-sm animate-slide-up">
        <div className="p-3">
          {/* Compact View */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-neon-purple drop-shadow-lg" />
                <span className="text-sm font-gaming text-white">Lv.{level}</span>
              </div>
              <div className="flex-1 max-w-24">
                <Progress value={xpProgress} className="h-2 bg-engagement-card [&>div]:bg-gradient-to-r [&>div]:from-neon-blue [&>div]:to-neon-purple [&>div]:animate-neon-pulse" />
              </div>
              <Badge variant="secondary" className="text-xs bg-neon-orange/20 text-neon-orange border-neon-orange/30 animate-streak-fire">
                <Flame className="h-3 w-3 mr-1" />
                {streak_count}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>

          {/* Expanded View */}
          {isExpanded && (
            <div className="space-y-3 pt-2 border-t border-engagement-border animate-slide-up">
              {/* XP Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-neon-blue/80">
                  <span className="font-gaming">Level {level}</span>
                  <span className="font-gaming">{currentLevelXP}/{baseXPForLevel} XP</span>
                </div>
                <Progress value={xpProgress} className="h-2 bg-engagement-card [&>div]:bg-gradient-to-r [&>div]:from-neon-blue [&>div]:to-neon-purple [&>div]:animate-neon-pulse" />
              </div>

              {/* Missions */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-neon-green drop-shadow-lg" />
                    <span className="text-xs font-gaming text-white">Daily</span>
                  </div>
                  <Progress value={dailyProgress} className="h-1.5 bg-engagement-card [&>div]:bg-neon-green [&>div]:shadow-lg [&>div]:shadow-neon-green/30" />
                  <span className="text-xs text-neon-green/80 font-gaming">
                    {completedDailyMissions}/{dailyMissions.length}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3 text-neon-pink drop-shadow-lg" />
                    <span className="text-xs font-gaming text-white">Weekly</span>
                  </div>
                  <Progress value={weeklyProgress} className="h-1.5 bg-engagement-card [&>div]:bg-neon-pink [&>div]:shadow-lg [&>div]:shadow-neon-pink/30" />
                  <span className="text-xs text-neon-pink/80 font-gaming">
                    {completedWeeklyMissions}/{weeklyMissions.length}
                  </span>
                </div>
              </div>

              {/* Season Rewards */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Gift className="h-3 w-3 text-neon-blue drop-shadow-lg" />
                  <span className="text-white font-gaming">
                    Next: {nextFreeReward?.reward_value || 'Max Level'}
                  </span>
                </div>
                {nextPremiumReward && (
                  <div className="flex items-center gap-1">
                    {premiumActive ? (
                      <Star className="h-3 w-3 text-neon-gold animate-premium-glow" />
                    ) : (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={cn(
                      "font-gaming",
                      premiumActive ? "text-neon-gold animate-premium-glow" : "text-muted-foreground"
                    )}>
                      {nextPremiumReward.reward_value}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block fixed right-0 top-1/2 -translate-y-1/2 z-40 animate-slide-right">
        <Card className="bg-gradient-to-br from-engagement-bg-start to-engagement-bg-end border-engagement-border w-80 mr-4 backdrop-blur-sm shadow-2xl shadow-neon-blue/20">
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-neon-purple drop-shadow-lg" />
                <span className="font-gaming text-white text-lg">Progress</span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1"
                >
                  {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(true)}
                  className="p-1"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Compact View */}
            {!isExpanded && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-neon-purple drop-shadow-lg" />
                    <span className="font-gaming text-white">Lv.{level}</span>
                  </div>
                  <div className="flex-1">
                    <Progress value={xpProgress} className="h-2 bg-engagement-card [&>div]:bg-gradient-to-r [&>div]:from-neon-blue [&>div]:to-neon-purple [&>div]:animate-neon-pulse" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="bg-neon-orange/20 text-neon-orange border-neon-orange/30 animate-streak-fire">
                    <Flame className="h-3 w-3 mr-1" />
                    {streak_count} streak
                  </Badge>
                  <Badge variant="outline" className="border-neon-green/30 text-neon-green bg-neon-green/10">
                    {completedDailyMissions + completedWeeklyMissions} missions
                  </Badge>
                </div>
              </div>
            )}

            {/* Expanded View */}
            {isExpanded && (
              <div className="space-y-4 animate-slide-left">
                {/* XP Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-neon-purple drop-shadow-lg" />
                      <span className="font-gaming text-white">Level {level}</span>
                    </div>
                    <span className="text-sm text-neon-blue/80 font-gaming">
                      {xpToNext} XP to next
                    </span>
                  </div>
                  <Progress value={xpProgress} className="h-3 bg-engagement-card [&>div]:bg-gradient-to-r [&>div]:from-neon-blue [&>div]:to-neon-purple [&>div]:animate-neon-pulse [&>div]:shadow-lg [&>div]:shadow-neon-blue/50" />
                  <div className="text-xs text-neon-blue/60 text-center font-gaming">
                    {currentLevelXP}/{baseXPForLevel} XP
                  </div>
                </div>

                {/* Missions */}
                <div className="space-y-3">
                  <h4 className="font-gaming text-white flex items-center gap-2">
                    <Zap className="h-4 w-4 text-neon-green drop-shadow-lg" />
                    Missions
                  </h4>
                  
                  {/* Daily Missions */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white font-gaming">Daily ({completedDailyMissions}/{dailyMissions.length})</span>
                      <span className="text-xs text-neon-green/80 font-gaming">{Math.round(dailyProgress)}%</span>
                    </div>
                    <Progress value={dailyProgress} className="h-2 bg-engagement-card [&>div]:bg-neon-green [&>div]:shadow-lg [&>div]:shadow-neon-green/30" />
                  </div>

                  {/* Weekly Missions */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white font-gaming">Weekly ({completedWeeklyMissions}/{weeklyMissions.length})</span>
                      <span className="text-xs text-neon-pink/80 font-gaming">{Math.round(weeklyProgress)}%</span>
                    </div>
                    <Progress value={weeklyProgress} className="h-2 bg-engagement-card [&>div]:bg-neon-pink [&>div]:shadow-lg [&>div]:shadow-neon-pink/30" />
                  </div>
                </div>

                {/* Streak */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-neon-orange drop-shadow-lg animate-streak-fire" />
                    <span className="font-gaming text-white">Streak</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Badge variant="secondary" className="bg-neon-orange/20 text-neon-orange border-neon-orange/30 animate-streak-fire font-gaming">
                      {streak_count} days
                    </Badge>
                    <span className="text-xs text-neon-orange/80 font-gaming">
                      Next bonus at {Math.ceil((streak_count + 1) / 7) * 7}
                    </span>
                  </div>
                </div>

                {/* Season Rewards */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-neon-blue drop-shadow-lg" />
                    <span className="font-gaming text-white">Season Rewards</span>
                  </div>
                  
                  {/* Free Reward */}
                  <div className="flex items-center justify-between p-2 bg-neon-blue/10 rounded-lg border border-neon-blue/20 shadow-lg shadow-neon-blue/20">
                    <div className="flex items-center gap-2">
                      <Gift className="h-3 w-3 text-neon-blue drop-shadow-lg" />
                      <span className="text-sm font-gaming text-white">Free</span>
                    </div>
                    <span className="text-xs font-gaming text-neon-blue">
                      {nextFreeReward?.reward_value || 'Max Level'}
                    </span>
                  </div>

                  {/* Premium Reward */}
                  {nextPremiumReward && (
                    <div className={cn(
                      "flex items-center justify-between p-2 rounded-lg border shadow-lg",
                      premiumActive 
                        ? "bg-neon-gold/10 border-neon-gold/20 animate-premium-glow shadow-neon-gold/20" 
                        : "bg-muted/50 border-muted"
                    )}>
                      <div className="flex items-center gap-2">
                        {premiumActive ? (
                          <Star className="h-3 w-3 text-neon-gold animate-premium-glow drop-shadow-lg" />
                        ) : (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className={cn(
                          "text-sm font-gaming",
                          premiumActive ? "text-neon-gold animate-premium-glow" : "text-muted-foreground"
                        )}>
                          Premium
                        </span>
                      </div>
                      <span className={cn(
                        "text-xs font-gaming",
                        premiumActive ? "text-neon-gold animate-premium-glow" : "text-muted-foreground"
                      )}>
                        {nextPremiumReward.reward_value}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};