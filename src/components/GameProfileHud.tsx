// Profile component with unified avatar configuration
import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useProfile } from '@/hooks/useProfile';
import { useLevelRewardsTrack, type LevelRewardItem } from '@/hooks/useLevelRewardsTrack';
import { AvatarConfiguration } from '@/components/AvatarConfiguration';
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar';
import { resolveAvatarFrameAsset } from '@/utils/avatarFrames';
import { resolveAvatarBorderAsset } from '@/utils/avatarBorders';
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

  const [selectedReward, setSelectedReward] = useState<LevelRewardItem | null>(null);
  const [showAvatarConfig, setShowAvatarConfig] = useState(false);
  const { profile, loading: profileLoading } = useProfile();
  const { xp, level, streak_count, loading: progressLoading } = useProgress();
  
  // Determine if premium is active - check profile subscription or entitlement
  const isPremium = false; // TODO: Connect to actual premium status
  const { free, premium } = useLevelRewardsTrack(level, isPremium);

  const loading = progressLoading || profileLoading;

  // Get current avatar frame asset URL
  const currentFrameAsset = useMemo(() => {
    if (!profile?.avatar_frame_id) return null;
    const frameReward = [...free, ...premium].find(
      item => item.id === profile.avatar_frame_id && item.reward_type === 'item' && item.item_code?.startsWith('frame_')
    );
    return frameReward?.assetUrl || null;
  }, [profile?.avatar_frame_id, JSON.stringify(free), JSON.stringify(premium)]);

  // Get current avatar border asset URL
  const currentBorderAsset = useMemo(() => {
    if (!profile?.avatar_border_id) return null;
    const borderReward = [...free, ...premium].find(
      item => item.id === profile.avatar_border_id && item.reward_type === 'item' && item.item_code?.startsWith('border_')
    );
    return borderReward?.assetUrl || null;
  }, [profile?.avatar_border_id, JSON.stringify(free), JSON.stringify(premium)]);

  // Calculate XP progress
  const baseXPForLevel = 1000 + level * 100;
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

  const mainContentHeight = isSheet ? "max-h-[calc(85vh-2rem)]" : "min-h-screen";

  const content = (
    <div className={`${paddingClass} space-y-6`}>
          {/* Avatar & Level Header */}
          <Card className="bg-gradient-to-br from-[#1A1F26] via-[#252A32] to-[#12161C] border border-white/[0.08] overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/5 to-neon-purple/5"></div>
            <CardContent className="relative z-10 p-6 text-center">
              {/* Avatar */}
              <div className="relative mx-auto w-20 h-20 mb-4">
                <EnhancedAvatar
                  src={profile?.avatar_url}
                  alt="User Avatar"
                  fallback={user?.email?.slice(0, 2).toUpperCase() || <User className="w-8 h-8" />}
                  frameUrl={currentFrameAsset}
                  borderUrl={currentBorderAsset}
                  size="xl"
                  className="shadow-[0_0_30px_rgba(79,172,254,0.3)]"
                />
                
                {/* Configure Avatar Button */}
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowAvatarConfig(true)}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full p-0 bg-[#1A1F26] border-neon-blue/50 hover:border-neon-blue"
                  style={{ zIndex: 4 }}
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
                <div className="relative">
                  <div 
                    className="h-2 bg-black/40 rounded-full shadow-inner overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.floor(currentLevelXP)}
                    aria-valuemin={0}
                    aria-valuemax={baseXPForLevel}
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
              {!isPremium && (
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
                          ((level - (free[0]?.level || 1)) / 
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
                {!isPremium && (
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
        </div>
  );

  if (isSheet) {
    return (
      <div className={containerClass}>
        {content}

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
              {selectedReward?.item_code || selectedReward?.reward_type === 'credits' ? 'Credits' : 'Reward'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Large Icon */}
            <div className="flex justify-center">
              <div className="w-24 h-24 flex items-center justify-center">
                {selectedReward?.assetUrl ? (
                  <img 
                    src={selectedReward.assetUrl} 
                    alt={`${selectedReward.reward_type} reward`} 
                    className="w-20 h-20 object-contain" 
                  />
                ) : selectedReward?.reward_type === 'credits' ? (
                  <Coins className="w-20 h-20 text-yellow-400" />
                ) : selectedReward?.item_code?.startsWith('badge_') ? (
                  <Star className="w-20 h-20 text-neon-blue" />
                ) : selectedReward?.item_code?.startsWith('frame_') ? (
                  <Trophy className="w-20 h-20 text-purple-400" />
                ) : selectedReward?.item_code?.startsWith('border_') ? (
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
              {selectedReward?.reward_type === 'credits' && selectedReward?.amount && (
                <p className="text-yellow-400 font-gaming text-lg mt-2">
                  {selectedReward.amount} Credits
                </p>
              )}
            </div>

            {/* State Display */}
            <div className="flex justify-center">
              {selectedReward?.unlocked ? (
                <Badge className="bg-green-500/20 text-[#79FFD7] border-[#79FFD7]/30">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Unlocked
                </Badge>
              ) : (
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
    );
  }

  return (
    <div className={containerClass}>
      <ScrollArea className={mainContentHeight}>
        {content}
      </ScrollArea>

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
              {selectedReward?.item_code || selectedReward?.reward_type === 'credits' ? 'Credits' : 'Reward'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Large Icon */}
            <div className="flex justify-center">
              <div className="w-24 h-24 flex items-center justify-center">
                {selectedReward?.assetUrl ? (
                  <img 
                    src={selectedReward.assetUrl} 
                    alt={`${selectedReward.reward_type} reward`} 
                    className="w-20 h-20 object-contain" 
                  />
                ) : selectedReward?.reward_type === 'credits' ? (
                  <Coins className="w-20 h-20 text-yellow-400" />
                ) : selectedReward?.item_code?.startsWith('badge_') ? (
                  <Star className="w-20 h-20 text-neon-blue" />
                ) : selectedReward?.item_code?.startsWith('frame_') ? (
                  <Trophy className="w-20 h-20 text-purple-400" />
                ) : selectedReward?.item_code?.startsWith('border_') ? (
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
              {selectedReward?.reward_type === 'credits' && selectedReward?.amount && (
                <p className="text-yellow-400 font-gaming text-lg mt-2">
                  {selectedReward.amount} Credits
                </p>
              )}
            </div>

            {/* State Display */}
            <div className="flex justify-center">
              {selectedReward?.unlocked ? (
                <Badge className="bg-green-500/20 text-[#79FFD7] border-[#79FFD7]/30">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Unlocked
                </Badge>
              ) : (
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
  );
};

// Reward Card Component
interface RewardCardProps {
  item: LevelRewardItem;
  onClick: () => void;
}

const RewardCard: React.FC<RewardCardProps> = ({ item, onClick }) => {
  const isUnlocked = item.unlocked;
  const isClaimable = false; // Level rewards are directly unlocked, no claim step
  const isLocked = !item.unlocked;

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
            alt={`${item.reward_type} reward`} 
            className={cn(
              "w-8 h-8 object-contain transition-all duration-300",
              isLocked && "grayscale opacity-50"
            )} 
            loading="lazy" 
          />
        ) : item.reward_type === 'credits' ? (
          <Coins className={cn("w-6 h-6", isLocked ? "text-gray-500" : "text-yellow-400")} />
        ) : item.item_code?.startsWith('badge_') ? (
          <Star className={cn("w-6 h-6", isLocked ? "text-gray-500" : "text-neon-blue")} />
        ) : item.item_code?.startsWith('frame_') ? (
          <Trophy className={cn("w-6 h-6", isLocked ? "text-gray-500" : "text-purple-400")} />
        ) : item.item_code?.startsWith('border_') ? (
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