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
  Gift
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
      <div className="fixed bottom-4 right-4 md:top-1/2 md:bottom-auto md:-translate-y-1/2 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          size="sm"
          className="rounded-full bg-theme-purple hover:bg-theme-purple/80 text-white shadow-lg"
        >
          <Trophy className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Layout */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-theme-card border-t border-theme-border">
        <div className="p-3">
          {/* Compact View */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-theme-purple" />
                <span className="text-sm font-medium">Lv.{data.playerLevel}</span>
              </div>
              <div className="flex-1 max-w-24">
                <Progress value={xpProgress} className="h-2" />
              </div>
              <Badge variant="secondary" className="text-xs">
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
            <div className="space-y-3 pt-2 border-t border-theme-border">
              {/* XP Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Level {data.playerLevel}</span>
                  <span>{data.currentXP}/{data.totalXPForLevel} XP</span>
                </div>
                <Progress value={xpProgress} className="h-2" />
              </div>

              {/* Missions */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3 text-theme-accent" />
                    <span className="text-xs font-medium">Daily</span>
                  </div>
                  <Progress value={dailyProgress} className="h-1.5" />
                  <span className="text-xs text-muted-foreground">
                    {completedDailyMissions}/{data.dailyMissions.length}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3 text-theme-secondary" />
                    <span className="text-xs font-medium">Weekly</span>
                  </div>
                  <Progress value={weeklyProgress} className="h-1.5" />
                  <span className="text-xs text-muted-foreground">
                    {completedWeeklyMissions}/{data.weeklyMissions.length}
                  </span>
                </div>
              </div>

              {/* Season Rewards */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Gift className="h-3 w-3 text-theme-accent" />
                  <span>Next: {data.nextFreeReward.freeReward}</span>
                </div>
                {data.nextPremiumReward && (
                  <div className="flex items-center gap-1">
                    {data.hasPremiumPass ? (
                      <Star className="h-3 w-3 text-yellow-500" />
                    ) : (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={cn(
                      data.hasPremiumPass ? "text-yellow-500" : "text-muted-foreground"
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
      <div className="hidden md:block fixed right-0 top-1/2 -translate-y-1/2 z-40">
        <Card className="bg-theme-card border-theme-border w-80 mr-4">
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-theme-purple" />
                <span className="font-semibold">Progress</span>
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
                    <Star className="h-4 w-4 text-theme-purple" />
                    <span className="font-medium">Lv.{data.playerLevel}</span>
                  </div>
                  <div className="flex-1">
                    <Progress value={xpProgress} className="h-2" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    <Flame className="h-3 w-3 mr-1" />
                    {data.currentStreak} streak
                  </Badge>
                  <Badge variant="outline">
                    {completedDailyMissions + completedWeeklyMissions} missions
                  </Badge>
                </div>
              </div>
            )}

            {/* Expanded View */}
            {isExpanded && (
              <div className="space-y-4">
                {/* XP Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-theme-purple" />
                      <span className="font-medium">Level {data.playerLevel}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {data.xpToNext} XP to next
                    </span>
                  </div>
                  <Progress value={xpProgress} className="h-3" />
                  <div className="text-xs text-muted-foreground text-center">
                    {data.currentXP}/{data.totalXPForLevel} XP
                  </div>
                </div>

                {/* Missions */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-theme-accent" />
                    Missions
                  </h4>
                  
                  {/* Daily Missions */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Daily ({completedDailyMissions}/{data.dailyMissions.length})</span>
                      <span className="text-xs text-muted-foreground">{Math.round(dailyProgress)}%</span>
                    </div>
                    <Progress value={dailyProgress} className="h-2" />
                  </div>

                  {/* Weekly Missions */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Weekly ({completedWeeklyMissions}/{data.weeklyMissions.length})</span>
                      <span className="text-xs text-muted-foreground">{Math.round(weeklyProgress)}%</span>
                    </div>
                    <Progress value={weeklyProgress} className="h-2" />
                  </div>
                </div>

                {/* Streak */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">Streak</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                      {data.currentStreak} days
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Next bonus at {data.nextStreakBonus}
                    </span>
                  </div>
                </div>

                {/* Season Rewards */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-theme-purple" />
                    <span className="font-medium">Season Rewards</span>
                  </div>
                  
                  {/* Free Reward */}
                  <div className="flex items-center justify-between p-2 bg-theme-accent/10 rounded-lg border border-theme-accent/20">
                    <div className="flex items-center gap-2">
                      <Gift className="h-3 w-3 text-theme-accent" />
                      <span className="text-sm">Free</span>
                    </div>
                    <span className="text-xs font-medium">{data.nextFreeReward.freeReward}</span>
                  </div>

                  {/* Premium Reward */}
                  {data.nextPremiumReward && (
                    <div className={cn(
                      "flex items-center justify-between p-2 rounded-lg border",
                      data.hasPremiumPass 
                        ? "bg-yellow-500/10 border-yellow-500/20" 
                        : "bg-muted/50 border-muted"
                    )}>
                      <div className="flex items-center gap-2">
                        {data.hasPremiumPass ? (
                          <Star className="h-3 w-3 text-yellow-500" />
                        ) : (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className={cn(
                          "text-sm",
                          data.hasPremiumPass ? "text-yellow-500" : "text-muted-foreground"
                        )}>
                          Premium
                        </span>
                      </div>
                      <span className={cn(
                        "text-xs font-medium",
                        data.hasPremiumPass ? "text-yellow-500" : "text-muted-foreground"
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