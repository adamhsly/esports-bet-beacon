import React, { useState } from 'react';
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

interface Mission {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
  xpReward: number;
}

interface SeasonReward {
  id: string;
  tier: number;
  freeReward: string;
  premiumReward?: string;
  unlocked: boolean;
  isPremium: boolean;
}

interface EngagementData {
  playerLevel: number;
  currentXP: number;
  xpToNext: number;
  totalXPForLevel: number;
  dailyMissions: Mission[];
  weeklyMissions: Mission[];
  currentStreak: number;
  nextStreakBonus: number;
  seasonProgress: number;
  nextFreeReward: SeasonReward;
  nextPremiumReward?: SeasonReward;
  hasPremiumPass: boolean;
}

interface EngagementBarProps {
  data: EngagementData;
}

export const EngagementBar: React.FC<EngagementBarProps> = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const completedDailyMissions = data.dailyMissions.filter(m => m.completed).length;
  const completedWeeklyMissions = data.weeklyMissions.filter(m => m.completed).length;
  const dailyProgress = (completedDailyMissions / data.dailyMissions.length) * 100;
  const weeklyProgress = (completedWeeklyMissions / data.weeklyMissions.length) * 100;
  const xpProgress = ((data.currentXP / data.totalXPForLevel) * 100);

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
                <span className="text-sm font-gaming text-white">Lv.{data.playerLevel}</span>
              </div>
              <div className="flex-1 max-w-24">
                <Progress value={xpProgress} className="h-2 bg-engagement-card [&>div]:bg-gradient-to-r [&>div]:from-neon-blue [&>div]:to-neon-purple [&>div]:animate-neon-pulse" />
              </div>
              <Badge variant="secondary" className="text-xs bg-neon-orange/20 text-neon-orange border-neon-orange/30 animate-streak-fire">
                <Flame className="h-3 w-3 mr-1" />
                {data.currentStreak}
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
                  <span className="font-gaming">Level {data.playerLevel}</span>
                  <span className="font-gaming">{data.currentXP}/{data.totalXPForLevel} XP</span>
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
                    {completedDailyMissions}/{data.dailyMissions.length}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3 text-neon-pink drop-shadow-lg" />
                    <span className="text-xs font-gaming text-white">Weekly</span>
                  </div>
                  <Progress value={weeklyProgress} className="h-1.5 bg-engagement-card [&>div]:bg-neon-pink [&>div]:shadow-lg [&>div]:shadow-neon-pink/30" />
                  <span className="text-xs text-neon-pink/80 font-gaming">
                    {completedWeeklyMissions}/{data.weeklyMissions.length}
                  </span>
                </div>
              </div>

              {/* Season Rewards */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Gift className="h-3 w-3 text-neon-blue drop-shadow-lg" />
                  <span className="text-white font-gaming">Next: {data.nextFreeReward.freeReward}</span>
                </div>
                {data.nextPremiumReward && (
                  <div className="flex items-center gap-1">
                    {data.hasPremiumPass ? (
                      <Star className="h-3 w-3 text-neon-gold animate-premium-glow" />
                    ) : (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={cn(
                      "font-gaming",
                      data.hasPremiumPass ? "text-neon-gold animate-premium-glow" : "text-muted-foreground"
                    )}>
                      {data.nextPremiumReward.premiumReward}
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
                    <span className="font-gaming text-white">Lv.{data.playerLevel}</span>
                  </div>
                  <div className="flex-1">
                    <Progress value={xpProgress} className="h-2 bg-engagement-card [&>div]:bg-gradient-to-r [&>div]:from-neon-blue [&>div]:to-neon-purple [&>div]:animate-neon-pulse" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="bg-neon-orange/20 text-neon-orange border-neon-orange/30 animate-streak-fire">
                    <Flame className="h-3 w-3 mr-1" />
                    {data.currentStreak} streak
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
                      <span className="font-gaming text-white">Level {data.playerLevel}</span>
                    </div>
                    <span className="text-sm text-neon-blue/80 font-gaming">
                      {data.xpToNext} XP to next
                    </span>
                  </div>
                  <Progress value={xpProgress} className="h-3 bg-engagement-card [&>div]:bg-gradient-to-r [&>div]:from-neon-blue [&>div]:to-neon-purple [&>div]:animate-neon-pulse [&>div]:shadow-lg [&>div]:shadow-neon-blue/50" />
                  <div className="text-xs text-neon-blue/60 text-center font-gaming">
                    {data.currentXP}/{data.totalXPForLevel} XP
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
                      <span className="text-sm text-white font-gaming">Daily ({completedDailyMissions}/{data.dailyMissions.length})</span>
                      <span className="text-xs text-neon-green/80 font-gaming">{Math.round(dailyProgress)}%</span>
                    </div>
                    <Progress value={dailyProgress} className="h-2 bg-engagement-card [&>div]:bg-neon-green [&>div]:shadow-lg [&>div]:shadow-neon-green/30" />
                  </div>

                  {/* Weekly Missions */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white font-gaming">Weekly ({completedWeeklyMissions}/{data.weeklyMissions.length})</span>
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
                      {data.currentStreak} days
                    </Badge>
                    <span className="text-xs text-neon-orange/80 font-gaming">
                      Next bonus at {data.nextStreakBonus}
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
                    <span className="text-xs font-gaming text-neon-blue">{data.nextFreeReward.freeReward}</span>
                  </div>

                  {/* Premium Reward */}
                  {data.nextPremiumReward && (
                    <div className={cn(
                      "flex items-center justify-between p-2 rounded-lg border shadow-lg",
                      data.hasPremiumPass 
                        ? "bg-neon-gold/10 border-neon-gold/20 animate-premium-glow shadow-neon-gold/20" 
                        : "bg-muted/50 border-muted"
                    )}>
                      <div className="flex items-center gap-2">
                        {data.hasPremiumPass ? (
                          <Star className="h-3 w-3 text-neon-gold animate-premium-glow drop-shadow-lg" />
                        ) : (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className={cn(
                          "text-sm font-gaming",
                          data.hasPremiumPass ? "text-neon-gold animate-premium-glow" : "text-muted-foreground"
                        )}>
                          Premium
                        </span>
                      </div>
                      <span className={cn(
                        "text-xs font-gaming",
                        data.hasPremiumPass ? "text-neon-gold animate-premium-glow" : "text-muted-foreground"
                      )}>
                        {data.nextPremiumReward.premiumReward}
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

// Mock data hook for development
export const useEngagementData = (): EngagementData => {
  return {
    playerLevel: 12,
    currentXP: 2840,
    xpToNext: 660,
    totalXPForLevel: 3500,
    dailyMissions: [
      { id: '1', title: 'Select 3 teams', description: 'Create a fantasy lineup', progress: 3, target: 3, completed: true, xpReward: 50 },
      { id: '2', title: 'Win 1 match', description: 'Have your team win a match', progress: 0, target: 1, completed: false, xpReward: 100 },
      { id: '3', title: 'Check leaderboard', description: 'View your ranking', progress: 1, target: 1, completed: true, xpReward: 25 }
    ],
    weeklyMissions: [
      { id: '4', title: 'Join 3 rounds', description: 'Participate in different rounds', progress: 1, target: 3, completed: false, xpReward: 200 },
      { id: '5', title: 'Top 10 finish', description: 'Finish in top 10 of any round', progress: 0, target: 1, completed: false, xpReward: 300 }
    ],
    currentStreak: 7,
    nextStreakBonus: 10,
    seasonProgress: 45,
    nextFreeReward: { 
      id: 'f1', 
      tier: 5, 
      freeReward: 'Team Boost', 
      unlocked: false, 
      isPremium: false 
    },
    nextPremiumReward: { 
      id: 'p1', 
      tier: 5, 
      freeReward: 'Team Boost', 
      premiumReward: 'Legendary Card Pack', 
      unlocked: false, 
      isPremium: true 
    },
    hasPremiumPass: false
  };
};