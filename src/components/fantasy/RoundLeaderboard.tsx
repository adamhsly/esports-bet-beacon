import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LeaderboardEntry {
  position: number;
  user_id: string;
  username: string;
  avatar_url?: string;
  total_score: number;
  is_current_user: boolean;
}

interface RoundLeaderboardProps {
  roundId: string;
}

export const RoundLeaderboard: React.FC<RoundLeaderboardProps> = ({ roundId }) => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [roundId, user]);

  const fetchLeaderboard = async () => {
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
        return;
      }

      // Create leaderboard entries
      const entries: LeaderboardEntry[] = scores.map((score) => ({
        position: score.user_position,
        user_id: score.user_id,
        username: '', // Will be filled from profiles
        total_score: score.total_score,
        is_current_user: user ? score.user_id === user.id : false
      }));

      // Find current user's position
      const currentUserEntry = entries.find(entry => entry.is_current_user);
      const currentUserPos = currentUserEntry?.position || null;
      setUserPosition(currentUserPos);

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
        .select('id, username, full_name, avatar_url')
        .in('id', displayUserIds);

      if (profilesError) throw profilesError;

      // Fill in profile data
      displayEntries.forEach(entry => {
        const profile = profiles?.find(p => p.id === entry.user_id);
        entry.username = profile?.username || profile?.full_name || 'Anonymous';
        entry.avatar_url = profile?.avatar_url;
      });

      setLeaderboard(displayEntries);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

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
      return 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30 border border-yellow-400/40';
    }
    
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/5 to-amber-500/5';
      case 2:
        return 'bg-gradient-to-r from-gray-400/5 to-gray-500/5';
      case 3:
        return 'bg-gradient-to-r from-orange-400/5 to-orange-500/5';
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

  return (
    <div className="space-y-1">
      {leaderboard.map((entry) => (
        <div
          key={entry.user_id}
          className={`flex items-center gap-3 py-2 px-1 rounded transition-colors h-11 ${getRowHighlight(entry.position, entry.is_current_user)}`}
        >
          {/* Rank */}
          <div className="w-6 flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {getRankDisplay(entry.position)}
            </span>
          </div>

          {/* Avatar */}
          <Avatar className="h-5 w-5">
            <AvatarImage src={entry.avatar_url} alt={entry.username} />
            <AvatarFallback className="text-xs text-white" style={{ backgroundColor: '#8B5CF6' }}>
              {entry.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

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
  );
};