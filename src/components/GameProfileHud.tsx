// Profile component with unified avatar configuration
import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useProfile } from '@/hooks/useProfile';
import { useRewardsTrack, type RewardItem } from '@/hooks/useRewardsTrack';
import { AvatarConfiguration } from '@/components/AvatarConfiguration';
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
  ChevronRight,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProgress } from '@/hooks/useSupabaseData';
import MissionsView from '@/components/MissionsView';

interface ProfilePageProps {
  variant?: 'page' | 'sheet';
  onUnlockPremium?: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ variant = 'page', onUnlockPremium }) => {
  const { user, isAuthenticated } = useAuthUser();

  // Early return before calling other hooks to prevent "fewer hooks" error
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

  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [showAvatarConfig, setShowAvatarConfig] = useState(false);
  const { profile, loading: profileLoading } = useProfile();
  const { xp, level, streak_count, loading: progressLoading } = useProgress();
  const { free, premium, currentLevel, premiumActive } = useRewardsTrack();

  const loading = progressLoading || profileLoading;

  // Get current avatar frame asset URL
  const currentFrameAsset = useMemo(() => {
    if (!profile?.avatar_frame_id) return null;
    const frameReward = [...free, ...premium].find(
      item => item.id === profile.avatar_frame_id && item.type === 'frame'
    );
    return frameReward?.assetUrl || null;
  }, [profile?.avatar_frame_id, JSON.stringify(free), JSON.stringify(premium)]);

  // Get current avatar border asset URL
  const currentBorderAsset = useMemo(() => {
    if (!profile?.avatar_border_id) return null;
    const borderReward = [...free, ...premium].find(
      item => item.id === profile.avatar_border_id && 
      item.value && 
      (item.value.toLowerCase().includes('border') || item.value.toLowerCase().includes('pulse'))
    );
    return borderReward?.assetUrl || null;
  }, [profile?.avatar_border_id, JSON.stringify(free), JSON.stringify(premium)]);

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

  const isSheet = variant === 'sheet';
  const containerClass = isSheet 
    ? "bg-[#0F1420] text-white" 
    : "min-h-screen bg-gradient-to-br from-[#0B0F14] to-[#12161C] text-white";
  const paddingClass = isSheet ? "p-4 sm:p-6" : "p-4";

  return (
    <div className={containerClass}>
      <div className={`${paddingClass} space-y-6`}>
        {/* Avatar & Level Header */}
        <Card className="bg-gradient-to-br from-[#1A1F26] via-[#252A32] to-[#12161C] border border-white/[0.08] overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/5 to-neon-purple/5"></div>
          <CardContent className="relative z-10 p-6 text-center">
            {/* Avatar */}
            <div className="relative mx-auto w-20 h-20 mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center text-2xl font-gaming text-white shadow-[0_0_30px_rgba(79,172,254,0.3)] overflow-hidden">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user?.email?.slice(0, 2).toUpperCase() || <User className="w-8 h-8" />
                )}
              </div>
              
              {/* Avatar Frame Overlay */}
              {currentFrameAsset && (
                <img 
                  src={currentFrameAsset}
                  alt="Avatar frame"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
              )}
              
              {/* Configure Avatar Button */}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowAvatarConfig(true)}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full p-0 bg-[#1A1F26] border-neon-blue/50 hover:border-neon-blue"
              >
                <Settings className="w-3 h-3 text-white" />
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
        <MissionsView />

        {/* Avatar Configuration Modal */}
        <AvatarConfiguration 
          isOpen={showAvatarConfig}
          onOpenChange={setShowAvatarConfig}
          currentAvatarUrl={profile?.avatar_url}
          currentFrameId={profile?.avatar_frame_id}
          currentBorderId={profile?.avatar_border_id}
          avatarFrameUrl={currentFrameAsset}
          avatarBorderUrl={currentBorderAsset}
        />

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

// Named export for sheet usage
export { ProfilePage };

// Legacy export for backward compatibility  
const GameProfileHud = ProfilePage;
export default GameProfileHud;