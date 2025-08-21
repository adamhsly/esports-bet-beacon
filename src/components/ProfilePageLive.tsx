import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useProgress, useMissions, useRewards, useEntitlement } from '@/hooks/useSupabaseData';
import { 
  User, 
  Trophy, 
  Star, 
  Zap, 
  Target, 
  Flame, 
  Crown, 
  Upload,
  Lock,
  Gift,
  CheckCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfilePageLiveProps {
  onUnlockPremium?: () => void;
}

const ProfilePageLive: React.FC<ProfilePageLiveProps> = ({ onUnlockPremium }) => {
  const { user, isAuthenticated } = useAuthUser();
  const { xp, level, streak_count, loading: progressLoading } = useProgress();
  const { missions, loading: missionsLoading } = useMissions();
  const { freeRewards, premiumRewards, loading: rewardsLoading } = useRewards();
  const { premiumActive, loading: entitlementLoading } = useEntitlement();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-engagement-bg-start to-engagement-bg-end flex items-center justify-center">
        <Card className="bg-gradient-to-br from-engagement-card to-engagement-bg-end border-engagement-border p-8">
          <div className="text-center">
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-gaming text-white mb-2">Profile Unavailable</h2>
            <p className="text-muted-foreground">Please sign in to view your profile</p>
          </div>
        </Card>
      </div>
    );
  }

  const loading = progressLoading || missionsLoading || rewardsLoading || entitlementLoading;

  // Calculate XP progress
  const baseXPForLevel = 1000 + (level - 1) * 100;
  const currentLevelXP = xp - ((level - 1) * 1000 + ((level - 1) * (level - 2) / 2) * 100);
  const xpProgress = Math.min((currentLevelXP / baseXPForLevel) * 100, 100);
  const xpToNext = Math.max(baseXPForLevel - currentLevelXP, 0);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRarityColor = (tier: string) => {
    switch (tier) {
      case 'premium': return 'text-neon-gold';
      case 'free': return 'text-neon-blue';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-engagement-bg-start to-engagement-bg-end">
        <div className="container mx-auto px-4 py-8 space-y-8">
          <Card className="bg-gradient-to-br from-engagement-card to-engagement-bg-end border-engagement-border">
            <CardContent className="p-8">
              <div className="animate-pulse space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-muted rounded-full"></div>
                  <div className="space-y-3 flex-1">
                    <div className="h-8 bg-muted rounded w-1/3"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-engagement-bg-start to-engagement-bg-end">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <Card className="bg-gradient-to-br from-engagement-card to-engagement-bg-end border-engagement-border overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/10 to-neon-blue/10 animate-neon-pulse"></div>
          <CardContent className="relative z-10 p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-neon-purple to-neon-blue rounded-full flex items-center justify-center text-3xl font-gaming text-white animate-premium-glow">
                  {user?.email?.slice(0, 2).toUpperCase() || <User className="w-10 h-10" />}
                </div>
                <Button size="sm" variant="outline" className="absolute -bottom-2 -right-2 rounded-full p-2 bg-engagement-card border-neon-blue">
                  <Upload className="w-3 h-3" />
                </Button>
              </div>
              
              {/* User Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                  <h1 className="text-3xl font-gaming text-white">
                    {user?.email?.split('@')[0] || 'Cyber Champion'}
                  </h1>
                  <Badge className="bg-gradient-to-r from-neon-purple to-neon-blue text-white border-none animate-neon-pulse">
                    <Star className="w-3 h-3 mr-1" />
                    Level {level}
                  </Badge>
                </div>
                <p className="text-neon-blue font-gaming mb-4">Master of the Virtual Arena</p>
                
                {/* XP Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-white font-gaming">
                    <span>Level {level}</span>
                    <span>{currentLevelXP} / {baseXPForLevel} XP</span>
                  </div>
                  <Progress 
                    value={xpProgress} 
                    className="h-3 bg-engagement-bg-start [&>div]:bg-gradient-to-r [&>div]:from-neon-blue [&>div]:to-neon-purple [&>div]:animate-neon-pulse [&>div]:shadow-lg [&>div]:shadow-neon-blue/50"
                  />
                  <p className="text-xs text-neon-blue/80 font-gaming">{xpToNext} XP to next level</p>
                </div>
              </div>

              {/* Streak & Premium */}
              <div className="flex flex-col gap-3">
                <Badge className="bg-neon-orange/20 text-neon-orange border-neon-orange/30 animate-streak-fire font-gaming">
                  <Flame className="w-4 h-4 mr-2" />
                  {streak_count} Day Streak
                </Badge>
                {premiumActive ? (
                  <Badge className="bg-neon-gold/20 text-neon-gold border-neon-gold/30 animate-premium-glow font-gaming">
                    <Crown className="w-4 h-4 mr-2" />
                    Premium Active
                  </Badge>
                ) : (
                  <Button 
                    size="sm" 
                    className="bg-gradient-to-r from-neon-gold to-neon-orange hover:from-neon-gold/80 hover:to-neon-orange/80 text-white font-gaming animate-premium-glow"
                    onClick={onUnlockPremium}
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Unlock Premium
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="progress" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-engagement-card border-engagement-border">
            <TabsTrigger value="progress" className="font-gaming data-[state=active]:bg-neon-purple/20 data-[state=active]:text-neon-purple">
              <Trophy className="w-4 h-4 mr-2" />
              Progress
            </TabsTrigger>
            <TabsTrigger value="missions" className="font-gaming data-[state=active]:bg-neon-green/20 data-[state=active]:text-neon-green">
              <Zap className="w-4 h-4 mr-2" />
              Missions
            </TabsTrigger>
            <TabsTrigger value="rewards" className="font-gaming data-[state=active]:bg-neon-blue/20 data-[state=active]:text-neon-blue">
              <Gift className="w-4 h-4 mr-2" />
              Rewards
            </TabsTrigger>
          </TabsList>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <Card className="bg-gradient-to-br from-engagement-card to-engagement-bg-end border-engagement-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white font-gaming">
                  <Trophy className="w-5 h-5 text-neon-purple" />
                  Level Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="text-6xl font-gaming text-neon-purple animate-neon-pulse">{level}</div>
                  <Progress 
                    value={xpProgress} 
                    className="h-6 bg-engagement-bg-start [&>div]:bg-gradient-to-r [&>div]:from-neon-blue [&>div]:to-neon-purple [&>div]:animate-neon-pulse [&>div]:shadow-lg [&>div]:shadow-neon-blue/50"
                  />
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-gaming text-neon-blue">{xp}</p>
                      <p className="text-sm text-muted-foreground">Total XP</p>
                    </div>
                    <div>
                      <p className="text-2xl font-gaming text-neon-green">{currentLevelXP}</p>
                      <p className="text-sm text-muted-foreground">Level XP</p>
                    </div>
                    <div>
                      <p className="text-2xl font-gaming text-neon-orange">{xpToNext}</p>
                      <p className="text-sm text-muted-foreground">To Next</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Missions Tab */}
          <TabsContent value="missions" className="space-y-6">
            <div className="grid gap-6">
              {/* Daily Missions */}
              <Card className="bg-gradient-to-br from-engagement-card to-engagement-bg-end border-engagement-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white font-gaming">
                    <Zap className="w-5 h-5 text-neon-green" />
                    Daily Missions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {missions.filter(m => m.kind === 'daily').map((mission) => (
                      <div key={mission.id} className="flex items-center justify-between p-4 bg-engagement-bg-start rounded-lg border border-engagement-border">
                        <div className="flex items-center gap-3">
                          {mission.completed ? (
                            <CheckCircle className="w-5 h-5 text-neon-green" />
                          ) : (
                            <Clock className="w-5 h-5 text-muted-foreground" />
                          )}
                          <div>
                            <h4 className="font-gaming text-white">{mission.title}</h4>
                            <p className="text-sm text-muted-foreground">{mission.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={cn(
                            "font-gaming mb-2",
                            mission.completed 
                              ? "bg-neon-green/20 text-neon-green border-neon-green/30" 
                              : "bg-muted/20 text-muted-foreground border-muted/30"
                          )}>
                            {mission.progress}/{mission.target}
                          </Badge>
                          <div className="text-xs text-neon-blue">+{mission.xp_reward} XP</div>
                          <Progress 
                            value={(mission.progress / mission.target) * 100} 
                            className="h-1 mt-1 w-16 bg-engagement-card [&>div]:bg-neon-green"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Missions */}
              <Card className="bg-gradient-to-br from-engagement-card to-engagement-bg-end border-engagement-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white font-gaming">
                    <Target className="w-5 h-5 text-neon-pink" />
                    Weekly Missions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {missions.filter(m => m.kind === 'weekly').map((mission) => (
                      <div key={mission.id} className="flex items-center justify-between p-4 bg-engagement-bg-start rounded-lg border border-engagement-border">
                        <div className="flex items-center gap-3">
                          {mission.completed ? (
                            <CheckCircle className="w-5 h-5 text-neon-pink" />
                          ) : (
                            <Clock className="w-5 h-5 text-muted-foreground" />
                          )}
                          <div>
                            <h4 className="font-gaming text-white">{mission.title}</h4>
                            <p className="text-sm text-muted-foreground">{mission.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={cn(
                            "font-gaming mb-2",
                            mission.completed 
                              ? "bg-neon-pink/20 text-neon-pink border-neon-pink/30" 
                              : "bg-muted/20 text-muted-foreground border-muted/30"
                          )}>
                            {mission.progress}/{mission.target}
                          </Badge>
                          <div className="text-xs text-neon-blue">+{mission.xp_reward} XP</div>
                          <Progress 
                            value={(mission.progress / mission.target) * 100} 
                            className="h-1 mt-1 w-16 bg-engagement-card [&>div]:bg-neon-pink"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-6">
            <Card className="bg-gradient-to-br from-engagement-card to-engagement-bg-end border-engagement-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white font-gaming">
                  <Gift className="w-5 h-5 text-neon-blue" />
                  Season Pass Track
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Premium Status */}
                  {!premiumActive && (
                    <div className="p-4 bg-gradient-to-r from-neon-gold/10 to-neon-orange/10 rounded-lg border border-neon-gold/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-gaming text-neon-gold">Unlock Premium Track</h3>
                          <p className="text-sm text-neon-gold/80">Get access to exclusive rewards and bonuses</p>
                        </div>
                        <Button 
                          className="bg-gradient-to-r from-neon-gold to-neon-orange hover:from-neon-gold/80 hover:to-neon-orange/80 text-white font-gaming"
                          onClick={onUnlockPremium}
                        >
                          <Crown className="w-4 h-4 mr-2" />
                          Upgrade
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Rewards Grid */}
                  <div className="grid gap-4">
                    {[...Array(Math.max(10, Math.ceil(level / 5) * 5))].map((_, index) => {
                      const rewardLevel = (index + 1) * 5;
                      const freeReward = freeRewards.find(r => r.level_required === rewardLevel);
                      const premiumReward = premiumRewards.find(r => r.level_required === rewardLevel);
                      const isUnlocked = level >= rewardLevel;

                      return (
                        <div key={rewardLevel} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Free Track */}
                          <div className={cn(
                            "p-4 rounded-lg border",
                            isUnlocked 
                              ? "bg-neon-blue/10 border-neon-blue/20 shadow-lg shadow-neon-blue/20"
                              : "bg-muted/10 border-muted/20"
                          )}>
                            <div className="flex items-center justify-between mb-2">
                              <Badge className={cn(
                                "font-gaming",
                                isUnlocked 
                                  ? "bg-neon-blue/20 text-neon-blue border-neon-blue/30"
                                  : "bg-muted/20 text-muted-foreground border-muted/30"
                              )}>
                                Level {rewardLevel}
                              </Badge>
                              <div className="flex items-center gap-1">
                                <Gift className={cn("w-4 h-4", isUnlocked ? "text-neon-blue" : "text-muted-foreground")} />
                                <span className="text-xs font-gaming text-muted-foreground">FREE</span>
                              </div>
                            </div>
                            <h4 className={cn(
                              "font-gaming mb-1",
                              isUnlocked ? "text-white" : "text-muted-foreground"
                            )}>
                              {freeReward?.reward_value || `Reward Tier ${rewardLevel / 5}`}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {freeReward?.reward_type || 'Free Track Reward'}
                            </p>
                            {freeReward?.unlocked && (
                              <CheckCircle className="w-4 h-4 text-neon-green mt-2" />
                            )}
                          </div>

                          {/* Premium Track */}
                          <div className={cn(
                            "p-4 rounded-lg border relative",
                            isUnlocked && premiumActive
                              ? "bg-neon-gold/10 border-neon-gold/20 shadow-lg shadow-neon-gold/20 animate-premium-glow"
                              : "bg-muted/10 border-muted/20"
                          )}>
                            {!premiumActive && (
                              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                <Lock className="w-6 h-6 text-neon-gold" />
                              </div>
                            )}
                            <div className="flex items-center justify-between mb-2">
                              <Badge className={cn(
                                "font-gaming",
                                isUnlocked && premiumActive
                                  ? "bg-neon-gold/20 text-neon-gold border-neon-gold/30"
                                  : "bg-muted/20 text-muted-foreground border-muted/30"
                              )}>
                                Level {rewardLevel}
                              </Badge>
                              <div className="flex items-center gap-1">
                                <Star className={cn("w-4 h-4", isUnlocked && premiumActive ? "text-neon-gold" : "text-muted-foreground")} />
                                <span className="text-xs font-gaming text-muted-foreground">PREMIUM</span>
                              </div>
                            </div>
                            <h4 className={cn(
                              "font-gaming mb-1",
                              isUnlocked && premiumActive ? "text-neon-gold" : "text-muted-foreground"
                            )}>
                              {premiumReward?.reward_value || `Premium Tier ${rewardLevel / 5}`}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {premiumReward?.reward_type || 'Premium Track Reward'}
                            </p>
                            {premiumReward?.unlocked && premiumActive && (
                              <CheckCircle className="w-4 h-4 text-neon-gold mt-2" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfilePageLive;