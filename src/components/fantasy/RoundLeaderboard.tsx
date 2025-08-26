import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Crown, Trophy, Medal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LeaderboardEntry {
  position: number;
  user_id: string;
  username: string;
  avatar_url?: string;
  level: number;
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
    if (!user) return;

    try {
      // Get all scores for this round
      const { data: scores, error: scoresError } = await supabase
        .from('fantasy_round_picks')
        .select('user_id, total_score')
        .eq('round_id', roundId)
        .order('total_score', { ascending: false });

      if (scoresError) throw scoresError;

      if (!scores || scores.length === 0) {
        setLeaderboard([]);
        return;
      }

      // Get profile info for all users
      const userIds = scores.map(s => s.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Get user progress for all users
      const { data: userProgress, error: progressError } = await supabase
        .from('user_progress')
        .select('user_id, level')
        .in('user_id', userIds);

      if (progressError) throw progressError;

      // Create leaderboard entries
      const entries: LeaderboardEntry[] = scores.map((score, index) => {
        const profile = profiles?.find(p => p.id === score.user_id);
        const progress = userProgress?.find(p => p.user_id === score.user_id);
        
        return {
          position: index + 1,
          user_id: score.user_id,
          username: profile?.username || profile?.full_name || 'Anonymous',
          level: progress?.level || 1,
          total_score: score.total_score,
          is_current_user: score.user_id === user.id
        };
      });

      // Find current user's position
      const currentUserEntry = entries.find(entry => entry.is_current_user);
      const currentUserPos = currentUserEntry?.position || null;
      setUserPosition(currentUserPos);

      // Filter leaderboard based on user position
      let displayEntries: LeaderboardEntry[] = [];

      if (!currentUserPos || currentUserPos <= 5) {
        // Show top 5 if user is in top 5 or not found
        displayEntries = entries.slice(0, 5);
      } else {
        // Show top 5 + user's position context
        const top5 = entries.slice(0, 5);
        const userContext = entries.slice(
          Math.max(0, currentUserPos - 2),
          Math.min(entries.length, currentUserPos + 1)
        );
        
        // Combine and deduplicate
        const combined = [...top5, ...userContext];
        const seen = new Set();
        displayEntries = combined.filter(entry => {
          if (seen.has(entry.user_id)) return false;
          seen.add(entry.user_id);
          return true;
        });
      }

      setLeaderboard(displayEntries);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-4 w-4 text-[hsl(var(--neon-gold))]" />;
      case 2:
        return <Trophy className="h-4 w-4 text-gray-400" />;
      case 3:
        return <Medal className="h-4 w-4 text-orange-400" />;
      default:
        return <span className="text-sm font-medium text-muted-foreground">#{position}</span>;
    }
  };

  const getPositionBadgeColor = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-400 text-black';
      case 3:
        return 'bg-gradient-to-r from-orange-400 to-orange-500 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getAvatarFrame = (position: number) => {
    switch (position) {
      case 1:
        return 'ring-2 ring-[hsl(var(--neon-gold))] ring-offset-2 ring-offset-background';
      case 2:
        return 'ring-2 ring-gray-400 ring-offset-2 ring-offset-background';
      case 3:
        return 'ring-2 ring-orange-400 ring-offset-2 ring-offset-background';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <div className="w-8 h-8 bg-muted rounded-full" />
            <div className="w-4 h-4 bg-muted rounded" />
            <div className="w-20 h-4 bg-muted rounded flex-1" />
            <div className="w-12 h-4 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No scores yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {leaderboard.map((entry, index) => (
        <div
          key={entry.user_id}
          className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
            entry.is_current_user
              ? 'bg-primary/10 border border-primary/30'
              : 'bg-muted/30 hover:bg-muted/50'
          }`}
        >
          {/* Position */}
          <div className="flex items-center justify-center w-8">
            {entry.position <= 3 ? (
              <Badge className={`w-6 h-6 rounded-full p-0 flex items-center justify-center ${getPositionBadgeColor(entry.position)}`}>
                {entry.position}
              </Badge>
            ) : (
              getPositionIcon(entry.position)
            )}
          </div>

          {/* Avatar */}
          <Avatar className={`h-8 w-8 ${getAvatarFrame(entry.position)}`}>
            <AvatarImage src={entry.avatar_url} alt={entry.username} />
            <AvatarFallback className="text-xs">
              {entry.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Username and Level */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${
              entry.is_current_user ? 'text-primary' : 'text-foreground'
            }`}>
              {entry.username}
            </p>
            <p className="text-xs text-muted-foreground">
              Level {entry.level}
            </p>
          </div>

          {/* Score */}
          <div className="text-right">
            <p className="text-sm font-bold text-[hsl(var(--neon-green))]">
              {entry.total_score}
            </p>
            <p className="text-xs text-muted-foreground">pts</p>
          </div>
        </div>
      ))}

      {/* Show gap indicator if user is not in top 5 */}
      {userPosition && userPosition > 5 && leaderboard.some(e => e.position <= 5) && leaderboard.some(e => e.position > 5) && (
        <div className="flex items-center justify-center py-2">
          <div className="h-px bg-muted flex-1" />
          <span className="px-3 text-xs text-muted-foreground">...</span>
          <div className="h-px bg-muted flex-1" />
        </div>
      )}
    </div>
  );
};