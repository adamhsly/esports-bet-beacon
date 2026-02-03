import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar';
import { useRewardsTrack } from '@/hooks/useRewardsTrack';
import { PlayerSelectionsModal } from './PlayerSelectionsModal';
import { PositionChangeIndicator } from '@/components/ui/position-change-indicator';

interface MiniLeaderboardEntry {
  position: number;
  user_id: string;
  username: string;
  avatar_url?: string;
  avatar_frame_id?: string;
  avatar_border_id?: string;
  total_score: number;
  position_change?: number | null;
}

interface RoundCardMiniLeaderboardProps {
  roundId: string;
}

export const RoundCardMiniLeaderboard: React.FC<RoundCardMiniLeaderboardProps> = ({ roundId }) => {
  const { free, premium } = useRewardsTrack();
  const [entries, setEntries] = useState<MiniLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<{ userId: string; username: string } | null>(null);

  const fetchTopThree = useCallback(async () => {
    try {
      const { data: scores, error } = await supabase
        .rpc('get_public_fantasy_leaderboard', {
          p_round_id: roundId,
          p_limit: 3
        });

      if (error) throw error;

      if (!scores || scores.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      // Get profile info for top 3
      const userIds = scores.map((s: any) => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, avatar_frame_id, avatar_border_id')
        .in('id', userIds);

      const entriesWithProfiles: MiniLeaderboardEntry[] = scores.map((score: any) => {
        const profile = profiles?.find(p => p.id === score.user_id);
        return {
          position: score.user_position,
          user_id: score.user_id,
          username: profile?.username || profile?.full_name || 'Anonymous',
          avatar_url: profile?.avatar_url,
          avatar_frame_id: profile?.avatar_frame_id,
          avatar_border_id: profile?.avatar_border_id,
          total_score: score.total_score,
          position_change: score.position_change
        };
      });

      setEntries(entriesWithProfiles);
    } catch (error) {
      console.error('Error fetching mini leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [roundId]);

  useEffect(() => {
    fetchTopThree();
  }, [fetchTopThree]);

  const getRankEmoji = (position: number) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return position.toString();
    }
  };

  const getRowHighlight = (position: number) => {
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

  const handleRowClick = (entry: MiniLeaderboardEntry) => {
    setSelectedPlayer({
      userId: entry.user_id,
      username: entry.username
    });
  };

  if (loading) {
    return (
      <div className="w-full bg-theme-gray-dark rounded-lg px-2 py-1.5 border border-border/50">
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2 py-1 px-1 animate-pulse">
              <div className="w-5 h-4 bg-muted rounded" />
              <div className="w-5 h-5 bg-muted rounded-full" />
              <div className="w-16 h-3 bg-muted rounded flex-1" />
              <div className="w-8 h-3 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <>
      <div className="w-full bg-theme-gray-dark rounded-lg px-2 py-1.5 border border-border/50">
        <div className="space-y-0.5">
          {entries.map((entry) => (
            <div
              key={entry.user_id}
              onClick={() => handleRowClick(entry)}
              className={`flex items-center gap-2 py-1 px-1 rounded cursor-pointer transition-colors hover:brightness-110 ${getRowHighlight(entry.position)}`}
            >
              {/* Rank */}
              <div className="w-5 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-foreground">
                  {getRankEmoji(entry.position)}
                </span>
              </div>

              {/* Position Change Indicator */}
              <PositionChangeIndicator change={entry.position_change} size="sm" />

              {/* Avatar */}
              <MiniLeaderboardAvatar entry={entry} free={free} premium={premium} />

              {/* Username */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-white">
                  {entry.username}
                </p>
              </div>

              {/* Points */}
              <div className="text-right flex-shrink-0">
                <span className="text-xs font-bold text-white">
                  {entry.total_score}
                </span>
              </div>
            </div>
          ))}
        </div>
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

// Helper component for avatar with frames and borders
const MiniLeaderboardAvatar: React.FC<{
  entry: MiniLeaderboardEntry;
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
      className="h-5 w-5 flex-shrink-0"
    />
  );
};
