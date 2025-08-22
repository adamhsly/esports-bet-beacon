import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useRewardsTrack, type RewardItem } from '@/hooks/useRewardsTrack';
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
  Star,
  Lock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProgress, useMissions } from '@/hooks/useSupabaseData';

interface GameProfileHudProps {
  onUnlockPremium?: () => void;
}

const GameProfileHud: React.FC<GameProfileHudProps> = ({ onUnlockPremium }) => {
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const { user, isAuthenticated } = useAuthUser();
  const { xp, level, streak_count, loading: progressLoading } = useProgress();
  const { missions, loading: missionsLoading } = useMissions();
  const { free, premium, currentLevel, premiumActive } = useRewardsTrack();

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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-gaming text-[#EAF2FF]">Rewards</h2>
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
            <Badge className="bg-neon-blue/20 text-neon-blue border-neon-blue/30 font-gaming text-sm px-3 py-1">
              FREE
            </Badge>
            
            <div className="relative">
              <div 
                className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
                style={{ 
                  scrollbarWidth: 'none', 
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                {free.map((item) => (
                  <RewardCard 
                    key={`free-${item.id}`} 
                    item={item} 
                    onClick={() => setSelectedReward(item)} 
                  />
                ))}
              </div>
              
              {/* Progress Indicator */}
              {free.length > 0 && (
                <div className="relative mt-2">
                  <div className="h-0.5 bg-[#223049] rounded-full" />
                  <div 
                    className="absolute top-0 w-2 h-2 bg-neon-blue rounded-full transform -translate-y-1/2 -translate-x-1/2 shadow-[0_0_8px_rgba(79,172,254,0.6)]"
                    style={{
                      left: `${Math.min(100, Math.max(0, 
                        ((currentLevel - (free[0]?.level || 1)) / 
                        Math.max(1, (free[free.length - 1]?.level || 1) - (free[0]?.level || 1))) * 100
                      ))}%`
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* PREMIUM Track */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border-yellow-400/30 font-gaming text-sm px-3 py-1">
                PREMIUM
              </Badge>
              {!premiumActive && (
                <Button 
                  onClick={onUnlockPremium}
                  size="sm"
                  className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 text-yellow-400 border border-yellow-400/30 font-gaming text-xs px-2 py-1"
                >
                  Unlock Premium
                </Button>
              )}
            </div>
            
            <div 
              className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
              style={{ 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {premium.map((item) => (
                <RewardCard 
                  key={`premium-${item.id}`} 
                  item={item} 
                  onClick={() => setSelectedReward(item)} 
                />
              ))}
            </div>
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

        {/* Reward Detail Modal */}
        <Dialog open={!!selectedReward} onOpenChange={() => setSelectedReward(null)}>
          <DialogContent className="bg-[#0B1220] border border-[#223049] text-[#EAF2FF] max-w-sm mx-auto rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-gaming text-[#EAF2FF]">
                {selectedReward?.value || `${selectedReward?.type?.charAt(0).toUpperCase()}${selectedReward?.type?.slice(1)}`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Large Icon */}
              <div className="flex justify-center">
                <div className="w-24 h-24 flex items-center justify-center">
                  {selectedReward?.assetUrl ? (
                    <img 
                      src={selectedReward.assetUrl} 
                      alt={`${selectedReward.type} reward`} 
                      className="w-20 h-20 object-contain" 
                    />
                  ) : selectedReward?.type === 'credits' ? (
                    <Coins className="w-20 h-20 text-yellow-400" />
                  ) : selectedReward?.type === 'badge' ? (
                    <Star className="w-20 h-20 text-neon-blue" />
                  ) : selectedReward?.type === 'frame' ? (
                    <Trophy className="w-20 h-20 text-purple-400" />
                  ) : selectedReward?.type === 'border' ? (
                    <Target className="w-20 h-20 text-neon-purple" />
                  ) : (
                    <Crown className="w-20 h-20 text-yellow-400" />
                  )}
                </div>
              </div>

              {/* Unlock Level */}
              <div className="text-center">
                <p className="text-[#CFE3FF] text-sm">
                  Unlocks at Level {selectedReward?.level}
                </p>
              </div>

              {/* State Display */}
              <div className="flex justify-center">
                {selectedReward?.state === 'unlocked' && (
                  <Badge className="bg-green-500/20 text-[#79FFD7] border-[#79FFD7]/30">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Unlocked
                  </Badge>
                )}
                {selectedReward?.state === 'claimable' && (
                  <Badge className="bg-neon-blue/20 text-neon-blue border-neon-blue/30">
                    <Gift className="w-4 h-4 mr-1" />
                    Ready to Claim
                  </Badge>
                )}
                {selectedReward?.state === 'locked' && (
                  <Badge className="bg-[#F5C042]/20 text-[#F5C042] border-[#F5C042]/30">
                    <Lock className="w-4 h-4 mr-1" />
                    Locked
                  </Badge>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// Reward Card Component
interface RewardCardProps {
  item: RewardItem;
  onClick: () => void;
}

const RewardCard: React.FC<RewardCardProps> = ({ item, onClick }) => {
  const isUnlocked = item.state === 'unlocked';
  const isClaimable = item.state === 'claimable';
  const isLocked = item.state === 'locked';

  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative w-20 h-24 rounded-xl border cursor-pointer transition-all duration-300 flex flex-col items-center justify-center snap-start flex-shrink-0",
        "bg-[#0B1220] border-[#223049]",
        isUnlocked && "border-[#79FFD7]/50 shadow-[0_0_12px_rgba(121,255,215,0.3)]",
        isClaimable && "border-neon-blue/50 shadow-[0_0_18px_rgba(138,117,255,0.45)] animate-pulse",
        isLocked && "border-[#223049] opacity-60"
      )}
    >
      {/* Reward Visual */}
      <div className="mb-2">
        {item.assetUrl ? (
          <img 
            src={item.assetUrl} 
            alt={`${item.type} reward`} 
            className={cn(
              "w-8 h-8 object-contain transition-all duration-300",
              isLocked && "grayscale opacity-50"
            )} 
            loading="lazy" 
          />
        ) : item.type === 'credits' ? (
          <Coins className={cn("w-6 h-6", isLocked ? "text-gray-500" : "text-yellow-400")} />
        ) : item.type === 'badge' ? (
          <Star className={cn("w-6 h-6", isLocked ? "text-gray-500" : "text-neon-blue")} />
        ) : item.type === 'frame' ? (
          <Trophy className={cn("w-6 h-6", isLocked ? "text-gray-500" : "text-purple-400")} />
        ) : item.type === 'border' ? (
          <Target className={cn("w-6 h-6", isLocked ? "text-gray-500" : "text-neon-purple")} />
        ) : (
          <Crown className={cn("w-6 h-6", isLocked ? "text-gray-500" : "text-yellow-400")} />
        )}
      </div>

      {/* Status Icon */}
      {isUnlocked && (
        <CheckCircle className="absolute -top-1 -right-1 w-5 h-5 text-[#79FFD7] bg-[#0B1220] rounded-full border border-[#223049]" />
      )}
      {isLocked && (
        <Lock className="absolute -top-1 -right-1 w-4 h-4 text-[#F5C042] bg-[#0B1220] rounded-full border border-[#223049] p-0.5" />
      )}
      
      {/* Level Badge */}
      <div className="absolute -bottom-2 bg-[#F5C042] text-black text-xs font-bold px-2 py-0.5 rounded-full transform rotate-12">
        {item.level}
      </div>
    </div>
  );
};

export default GameProfileHud;