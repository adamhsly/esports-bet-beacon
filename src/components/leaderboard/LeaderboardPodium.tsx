import React, { useMemo } from 'react';
import { Crown } from 'lucide-react';
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar';
import { cn } from '@/lib/utils';

interface PodiumEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  avatar_frame_id: string | null;
  avatar_border_id: string | null;
  total_points: number;
  rank: number;
  is_current_user: boolean;
}

interface LeaderboardPodiumProps {
  entries: PodiumEntry[];
  free: any[];
  premium: any[];
}

const PodiumPlace: React.FC<{
  entry: PodiumEntry;
  position: 1 | 2 | 3;
  free: any[];
  premium: any[];
}> = ({ entry, position, free, premium }) => {
  const frameAsset = useMemo(() => {
    if (!entry.avatar_frame_id) return null;
    const frameReward = [...free, ...premium].find(
      item => item.id === entry.avatar_frame_id && item.type === 'frame'
    );
    return frameReward?.assetUrl || null;
  }, [entry.avatar_frame_id, free, premium]);

  const borderAsset = useMemo(() => {
    if (!entry.avatar_border_id) return null;
    const borderReward = [...free, ...premium].find(
      item => item.id === entry.avatar_border_id && 
      item.value && 
      (item.value.toLowerCase().includes('border') || item.value.toLowerCase().includes('pulse'))
    );
    return borderReward?.assetUrl || null;
  }, [entry.avatar_border_id, free, premium]);

  // Configuration for each position
  const config = {
    1: {
      size: 'xl' as const,
      avatarSize: 'h-20 w-20',
      ringColor: 'ring-[#FFCC33]',
      bgGradient: 'from-[#FFCC33]/20 to-[#FFD700]/10',
      nameColor: 'text-[#FFCC33]',
      order: 'order-2',
      height: 'pt-0',
      showCrown: true,
    },
    2: {
      size: 'lg' as const,
      avatarSize: 'h-16 w-16',
      ringColor: 'ring-[#C0C0C0]',
      bgGradient: 'from-[#C0C0C0]/20 to-[#A8A8A8]/10',
      nameColor: 'text-[#C0C0C0]',
      order: 'order-1',
      height: 'pt-8',
      showCrown: false,
    },
    3: {
      size: 'lg' as const,
      avatarSize: 'h-16 w-16',
      ringColor: 'ring-[#CD7F32]',
      bgGradient: 'from-[#CD7F32]/20 to-[#B87333]/10',
      nameColor: 'text-[#CD7F32]',
      order: 'order-3',
      height: 'pt-8',
      showCrown: false,
    },
  };

  const c = config[position];

  return (
    <div className={cn('flex flex-col items-center', c.order, c.height)}>
      {/* Crown for 1st place */}
      {c.showCrown && (
        <div className="mb-2">
          <Crown className="w-8 h-8 text-[#FFCC33] fill-[#FFCC33]/30" />
        </div>
      )}

      {/* Avatar with position badge */}
      <div className="relative mb-3">
        {/* Position badge */}
        <div 
          className={cn(
            'absolute -bottom-1 -left-1 z-10 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg',
            position === 1 && 'bg-gradient-to-br from-[#FFCC33] to-[#FFD700]',
            position === 2 && 'bg-gradient-to-br from-[#C0C0C0] to-[#A8A8A8]',
            position === 3 && 'bg-gradient-to-br from-[#CD7F32] to-[#B87333]'
          )}
        >
          {position}
        </div>

        <EnhancedAvatar
          src={entry.avatar_url}
          fallback={entry.username.slice(0, 2).toUpperCase()}
          frameUrl={frameAsset}
          borderUrl={borderAsset}
          size={c.size}
          className={c.avatarSize}
        />
      </div>

      {/* Username with colored background pill */}
      <div 
        className={cn(
          'px-3 py-1 rounded-full bg-gradient-to-r mb-1',
          c.bgGradient
        )}
      >
        <p className={cn('text-sm font-bold truncate max-w-[100px]', c.nameColor)}>
          {entry.username}
          {entry.is_current_user && ' (You)'}
        </p>
      </div>

      {/* Points */}
      <div className="flex items-center gap-1">
        <span className="text-white font-bold text-lg">
          {entry.total_points.toLocaleString()}
        </span>
        <span className="text-[#FFCC33] text-lg">⭐</span>
      </div>
    </div>
  );
};

export const LeaderboardPodium: React.FC<LeaderboardPodiumProps> = ({
  entries,
  free,
  premium,
}) => {
  // Get top 3 entries
  const first = entries.find(e => e.rank === 1);
  const second = entries.find(e => e.rank === 2);
  const third = entries.find(e => e.rank === 3);

  if (!first && !second && !third) {
    return null;
  }

  return (
    <div className="relative mb-8">
      {/* Subtle decorative elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#7a5cff]/5 to-transparent rounded-2xl" />
      
      <div className="relative flex justify-center items-end gap-4 sm:gap-8 py-6 px-4">
        {second && (
          <PodiumPlace entry={second} position={2} free={free} premium={premium} />
        )}
        {first && (
          <PodiumPlace entry={first} position={1} free={free} premium={premium} />
        )}
        {third && (
          <PodiumPlace entry={third} position={3} free={free} premium={premium} />
        )}
      </div>
    </div>
  );
};
