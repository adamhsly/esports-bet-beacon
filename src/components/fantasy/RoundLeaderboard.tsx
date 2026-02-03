import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRewardsTrack } from '@/hooks/useRewardsTrack';
import { PlayerSelectionsModal } from './PlayerSelectionsModal';
import { PositionChangeIndicator } from '@/components/ui/position-change-indicator';

interface LeaderboardEntry {
  position: number;
  user_id: string;
  username: string;
  avatar_url?: string;
  avatar_frame_id?: string;
  avatar_border_id?: string;
  total_score: number;
  is_current_user: boolean;
  position_change?: number | null;
}

interface RoundLeaderboardProps {
  roundId: string;
}

export const RoundLeaderboard: React.FC<RoundLeaderboardProps> = ({ roundId }) => {
  const { user } = useAuth();
  const { free, premium } = useRewardsTrack();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<{ userId: string; username: string } | null>(null);

  // Get user ID - memoize to prevent unnecessary re-renders
  const userId = user?.id;

  const fetchLeaderboard = useCallback(async () => {
    try {
      // Use RPC function to get public leaderboard data that bypasses RLS
      const { data: scores, error: scoresError } = await supabase
        .rpc('get_public_fantasy_leaderboard', {
          p_round_id: roundId,
          p_limit: null
        });

      if (scoresError) throw scoresError;

      if (!scores || scores.length === 0) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      // Create leaderboard entries - use userId from closure
      const entries: LeaderboardEntry[] = scores.map((score) => ({
        position: score.user_position,
        user_id: score.user_id,
        username: '', // Will be filled from profiles
        total_score: score.total_score,
        is_current_user: userId ? score.user_id === userId : false,
        position_change: score.position_change
      }));

      // Find current user's position
      const currentUserEntry = entries.find(entry => entry.is_current_user);
      const currentUserPos = currentUserEntry?.position || null;
      setUserPosition(currentUserPos);

      // Track leaderboard position missions
      if (currentUserPos && userId) {
        import('@/lib/missionBus').then(async ({ MissionBus }) => {
          if (currentUserPos <= 25) {
            MissionBus.onTop25Placement();
          }
          
          // Check for top 50% finish (any round type, but weekly mission tracks weekly)
          const { data: roundData } = await supabase
            .from('fantasy_rounds')
            .select('type')
            .eq('id', roundId)
            .single();
          
          // Track top 50% for weekly rounds specifically
          if (roundData?.type === 'weekly' && currentUserPos <= 50) {
            MissionBus.onWeeklyTop50();
          }
        });
      }

      // Apply 6-row logic
      let displayEntries: LeaderboardEntry[] = [];
      
      if (!currentUserPos || currentUserPos <= 3) {
        // User is in top 3 or not found: show positions 1-6
        displayEntries = entries.slice(0, 6);
      } else {
        // User is outside top 3: show top 3 + user's row + 1 above + 1 below
        const top3 = entries.slice(0, 3);
        const userAbove = currentUserPos > 4 ? entries.slice(currentUserPos - 2, currentUserPos - 1) : [];
        const userRow = entries.slice(currentUserPos - 1, currentUserPos);
        const userBelow = currentUserPos < entries.length ? entries.slice(currentUserPos, currentUserPos + 1) : [];
        
        displayEntries = [...top3, ...userAbove, ...userRow, ...userBelow];
      }

      // Get profile info only for displayed users
      const displayUserIds = displayEntries.map(e => e.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, avatar_frame_id, avatar_border_id')
        .in('id', displayUserIds);

      if (profilesError) throw profilesError;

      // Fill in profile data
      displayEntries.forEach(entry => {
        const profile = profiles?.find(p => p.id === entry.user_id);
        entry.username = profile?.username || profile?.full_name || 'Anonymous';
        entry.avatar_url = profile?.avatar_url;
        entry.avatar_frame_id = profile?.avatar_frame_id;
        entry.avatar_border_id = profile?.avatar_border_id;
      });

      setLeaderboard(displayEntries);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [roundId, userId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getRankDisplay = (position: number) => {
    switch (position) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return position.toString();
    }
  };

  const getRowHighlight = (position: number, isCurrentUser: boolean) => {
    if (isCurrentUser && position > 3) {
      return 'border border-green-500/80';
    }
    
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/40 to-amber-500/40';
      case 2:
        return 'bg-gradient-to-r from-gray-400/40 to-gray-500/40';
      case 3:
        return 'bg-gradient-to-r from-orange-400/40 to-orange-500/40';
      default:
        return 'hover:bg-muted/30';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-1">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2 px-1">
            <div className="w-6 h-4 bg-muted rounded" />
            <div className="w-5 h-5 bg-muted rounded-full" />
            <div className="w-20 h-3 bg-muted rounded flex-1" />
            <div className="w-12 h-3 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <div className="text-2xl mb-2">🏆</div>
        <p className="text-sm">No scores yet</p>
      </div>
    );
  }

  const handleRowClick = (entry: LeaderboardEntry) => {
    // Don't open modal for current user's row
    if (entry.is_current_user) return;
    
    setSelectedPlayer({
      userId: entry.user_id,
      username: entry.username
    });
  };

  return (
    <>
      <div className="space-y-1">
        {leaderboard.map((entry) => (
          <div
            key={entry.user_id}
            onClick={() => handleRowClick(entry)}
            className={`flex items-center gap-3 py-2 px-1 rounded transition-colors h-11 ${getRowHighlight(entry.position, entry.is_current_user)} ${!entry.is_current_user ? 'cursor-pointer hover:brightness-110' : ''}`}
          >
          {/* Rank */}
          <div className="w-6 flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {getRankDisplay(entry.position)}
            </span>
          </div>

          {/* Position Change */}
          <PositionChangeIndicator change={entry.position_change} size="sm" />

          {/* Avatar */}
          <LeaderboardAvatar entry={entry} free={free} premium={premium} />

          {/* Username */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-white">
              {entry.username}
            </p>
          </div>

          {/* Points */}
          <div className="text-right">
            <span className="text-sm font-bold text-white">
              {entry.total_score}
            </span>
          </div>
          </div>
        ))}
      </div>

      <PlayerSelectionsModal
        open={!!selectedPlayer}
        onOpenChange={(open) => !open && setSelectedPlayer(null)}
        userId={selectedPlayer?.userId || ''}
        username={selectedPlayer?.username || ''}
        roundId={roundId}
      />
    </>
  );
};

// Helper component for leaderboard avatar with proper borders and frames
const LeaderboardAvatar: React.FC<{
  entry: LeaderboardEntry;
  free: any[];
  premium: any[];
}> = ({ entry, free, premium }) => {
  const frameAsset = useMemo(() => {
    if (!entry.avatar_frame_id) return null;
    const frameReward = [...free, ...premium].find(
      item => item.id === entry.avatar_frame_id && item.type === 'frame'
    );
    return frameReward?.assetUrl || null;
  }, [entry.avatar_frame_id, JSON.stringify(free), JSON.stringify(premium)]);

  const borderAsset = useMemo(() => {
    if (!entry.avatar_border_id) return null;
    const borderReward = [...free, ...premium].find(
      item => item.id === entry.avatar_border_id && 
      item.value && 
      (item.value.toLowerCase().includes('border') || item.value.toLowerCase().includes('pulse'))
    );
    return borderReward?.assetUrl || null;
  }, [entry.avatar_border_id, JSON.stringify(free), JSON.stringify(premium)]);

  return (
    <EnhancedAvatar
      src={entry.avatar_url}
      fallback={entry.username.slice(0, 2).toUpperCase()}
      frameUrl={frameAsset}
      borderUrl={borderAsset}
      size="sm"
      className="h-5 w-5"
    />
  );
};
