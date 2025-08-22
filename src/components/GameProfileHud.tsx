import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useProgress, useMissions } from '@/hooks/useSupabaseData';
import { useRewardsTrack } from '@/hooks/useRewardsTrack';
import { 
  User, 
  Crown,
  Upload,
  CheckCircle,
  Clock,
  Flame,
  Coins,
  Gift,
  Zap,
  Trophy,
  Target,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameProfileHudProps {
  onUnlockPremium?: () => void;
}

const GameProfileHud: React.FC<GameProfileHudProps> = ({ onUnlockPremium }) => {
  const { user, isAuthenticated } = useAuthUser();
  const { xp, level, streak_count, loading: progressLoading } = useProgress();
  const { missions, loading: missionsLoading } = useMissions();
  const { free, premium, premiumActive } = useRewardsTrack();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B0F14] to-[#12161C] flex items-center justify-center p-4">
        <Card className="bg-gradient-to-br from-[#1A1F26] to-[#12161C] border border-white/[0.08] p-8 max-w-md w-full text-center">
          <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-gaming text-white mb-2">Profile Unavailable</h2>
          <p className="text-muted-foreground">Please sign in to view your profile</p>
        </Card>
      </div>
    );
  }

  const loading = progressLoading || missionsLoading;

  // Calculate XP progress
  const baseXPForLevel = 1000 + (level - 1) * 100;
  const currentLevelStart = level === 1 ? 0 : (level - 1) * 1000 + ((level - 1) * (level - 2) / 2) * 100;
  const currentLevelXP = xp - currentLevelStart;
  const xpProgress = Math.min((currentLevelXP / baseXPForLevel) * 100, 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B0F14] to-[#12161C] p-4">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-white/10 rounded-2xl"></div>
          <div className="h-20 bg-white/10 rounded-xl"></div>
          <div className="space-y-3">
            <div className="h-16 bg-white/10 rounded-xl"></div>
            <div className="h-16 bg-white/10 rounded-xl"></div>
            <div className="h-16 bg-white/10 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0F14] to-[#12161C] text-white">
      <div className="p-4 space-y-6">
        {/* Avatar & Level Header */}
        <Card className="bg-gradient-to-br from-[#1A1F26] via-[#252A32] to-[#12161C] border border-white/[0.08] overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/5 to-neon-purple/5"></div>
          <CardContent className="relative z-10 p-6 text-center">
            {/* Avatar */}
            <div className="relative mx-auto w-20 h-20 mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center text-2xl font-gaming text-white shadow-[0_0_30px_rgba(79,172,254,0.3)]">
                {user?.email?.slice(0, 2).toUpperCase() || <User className="w-8 h-8" />}
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full p-0 bg-[#1A1F26] border-neon-blue/50 hover:border-neon-blue"
              >
                <Upload className="w-3 h-3" />
              </Button>
            </div>

            {/* Level */}
            <h1 className="text-2xl font-gaming text-white mb-2">Level {level}</h1>
            
            {/* XP Progress */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm text-white/60">
                <span>{Math.floor(currentLevelXP)}</span>
                <span>{baseXPForLevel} XP</span>
              </div>
              <Progress 
                value={xpProgress} 
                className="h-2 bg-[#0F1722]"
              />
            </div>

            {/* Streak Badge */}
            {streak_count > 0 && (
              <Badge className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/30 text-orange-300 font-gaming">
                <Flame className="w-3 h-3 mr-1" />
                {streak_count} day streak
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Rewards Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-gaming text-white">Rewards</h2>
            {!premiumActive && (
              <Button 
                onClick={onUnlockPremium}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-gaming text-sm px-4 py-2 rounded-lg shadow-[0_0_20px_rgba(245,158,11,0.4)]"
              >
                <Flame className="w-4 h-4 mr-2" />
                Unlock Premium
              </Button>
            )}
          </div>

          {/* FREE Track */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-neon-blue/20 text-neon-blue border-neon-blue/30 font-gaming text-sm px-3 py-1">
                FREE
              </Badge>
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-2" style={{ width: 'max-content' }}>
                {free.map((item) => {
                  const isUnlocked = item.state === 'unlocked';
                  const isClaimable = item.state === 'claimable';

                  return (
                    <div 
                      key={`free-${item.id}`}
                      className={cn(
                        "relative w-20 h-24 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-300",
                        isUnlocked
                          ? "bg-gradient-to-b from-green-500/20 to-green-600/20 border-green-400/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                          : isClaimable
                            ? "bg-gradient-to-b from-neon-blue/20 to-neon-purple/20 border-neon-blue/50 shadow-[0_0_15px_rgba(79,172,254,0.3)] animate-pulse-glow"
                            : "bg-gradient-to-b from-white/5 to-white/[0.02] border-white/10"
                      )}
                    >
                      {/* Reward Visual */}
                      <div className="mb-1">
                        {item.assetUrl ? (
                          <img src={item.assetUrl} alt={`${item.type} reward`} className="w-8 h-8 object-contain" loading="lazy" />
                        ) : item.type === 'credits' ? (
                          <Coins className={cn("w-6 h-6", isUnlocked || isClaimable ? "text-yellow-400" : "text-white/30")} />
                        ) : item.type === 'badge' ? (
                          <Star className={cn("w-6 h-6", isUnlocked || isClaimable ? "text-neon-blue" : "text-white/30")} />
                        ) : item.type === 'frame' ? (
                          <Trophy className={cn("w-6 h-6", isUnlocked || isClaimable ? "text-purple-400" : "text-white/30")} />
                        ) : item.type === 'border' ? (
                          <Target className={cn("w-6 h-6", isUnlocked || isClaimable ? "text-neon-purple" : "text-white/30")} />
                        ) : (
                          <Crown className={cn("w-6 h-6", isUnlocked || isClaimable ? "text-yellow-400" : "text-white/30")} />
                        )}
                      </div>

                      {/* Status */}
                      {isUnlocked && (
                        <CheckCircle className="absolute -top-1 -right-1 w-5 h-5 text-green-400 bg-[#12161C] rounded-full" />
                      )}
                      
                      {/* Level Number */}
                      <div className={cn(
                        "absolute -bottom-2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full",
                        "transform rotate-12"
                      )}>
                        {item.level}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* PREMIUM Track */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border-yellow-400/30 font-gaming text-sm px-3 py-1">
                PREMIUM
              </Badge>
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-2" style={{ width: 'max-content' }}>
                {premium.map((item) => {
                  const isUnlocked = item.state === 'unlocked';
                  const isClaimable = item.state === 'claimable';
                  const lockedByEntitlement = !premiumActive;

                  return (
                    <div 
                      key={`premium-${item.id}`}
                      className={cn(
                        "relative w-20 h-24 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-300",
                        lockedByEntitlement
                          ? "bg-gradient-to-b from-white/5 to-white/[0.02] border-yellow-500/30"
                          : isUnlocked
                            ? "bg-gradient-to-b from-green-500/20 to-green-600/20 border-green-400/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                            : isClaimable
                              ? "bg-gradient-to-b from-yellow-500/20 to-orange-500/20 border-yellow-400/50 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse-glow"
                              : "bg-gradient-to-b from-white/5 to-white/[0.02] border-white/10"
                      )}
                    >
                      {/* Reward Visual */}
                      <div className="mb-1">
                        {item.assetUrl ? (
                          <img src={item.assetUrl} alt={`${item.type} reward`} className="w-8 h-8 object-contain" loading="lazy" />
                        ) : item.type === 'credits' ? (
                          <Coins className={cn("w-6 h-6", (isUnlocked || isClaimable) && !lockedByEntitlement ? "text-yellow-400" : "text-white/30")} />
                        ) : item.type === 'badge' ? (
                          <Star className={cn("w-6 h-6", (isUnlocked || isClaimable) && !lockedByEntitlement ? "text-neon-blue" : "text-white/30")} />
                        ) : item.type === 'frame' ? (
                          <Trophy className={cn("w-6 h-6", (isUnlocked || isClaimable) && !lockedByEntitlement ? "text-purple-400" : "text-white/30")} />
                        ) : item.type === 'border' ? (
                          <Target className={cn("w-6 h-6", (isUnlocked || isClaimable) && !lockedByEntitlement ? "text-neon-purple" : "text-white/30")} />
                        ) : (
                          <Crown className={cn("w-6 h-6", (isUnlocked || isClaimable) && !lockedByEntitlement ? "text-yellow-400" : "text-white/30")} />
                        )}
                      </div>

                      {/* Status Icons */}
                      {lockedByEntitlement && (
                        <Crown className="absolute -top-1 -right-1 w-5 h-5 text-yellow-400 bg-[#12161C] rounded-full animate-pulse-subtle" />
                      )}
                      {isUnlocked && !lockedByEntitlement && (
                        <CheckCircle className="absolute -top-1 -right-1 w-5 h-5 text-green-400 bg-[#12161C] rounded-full" />
                      )}
                      
                      {/* Level Number */}
                      <div className={cn(
                        "absolute -bottom-2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full",
                        "transform rotate-12"
                      )}>
                        {item.level}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Missions Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-gaming text-white">Missions</h2>
          
          <div className="space-y-3">
            {missions.map((mission) => (
              <Card 
                key={mission.id}
                className={cn(
                  "bg-gradient-to-r border transition-all duration-300",
                  mission.completed
                    ? "from-green-500/10 to-green-600/10 border-green-400/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                    : "from-[#1A1F26] to-[#252A32] border-white/[0.08] hover:border-neon-blue/30"
                )}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {/* Status Icon */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      mission.completed
                        ? "bg-green-500/20 text-green-400"
                        : "bg-neon-blue/20 text-neon-blue"
                    )}>
                      {mission.completed ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>
                    
                    {/* Mission Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-gaming text-white text-sm leading-tight">
                        {mission.title}
                      </h3>
                      <p className="text-xs text-white/60 mt-1">
                        {mission.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* XP Reward */}
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className={cn(
                      "text-lg font-gaming font-bold",
                      mission.completed ? "text-green-400" : "text-neon-blue"
                    )}>
                      +{mission.xp_reward} XP
                    </div>
                    <div className="text-xs text-white/40">
                      {mission.progress}/{mission.target}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameProfileHud;