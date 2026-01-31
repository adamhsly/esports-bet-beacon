import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MiniLeaderboardEntry {
  position: number;
  user_id: string;
  username: string;
  total_score: number;
}

interface RoundCardMiniLeaderboardProps {
  roundId: string;
}

export const RoundCardMiniLeaderboard: React.FC<RoundCardMiniLeaderboardProps> = ({ roundId }) => {
  const [entries, setEntries] = useState<MiniLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopThree = async () => {
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
          .select('id, username, full_name')
          .in('id', userIds);

        const entriesWithNames: MiniLeaderboardEntry[] = scores.map((score: any) => {
          const profile = profiles?.find(p => p.id === score.user_id);
          return {
            position: score.user_position,
            user_id: score.user_id,
            username: profile?.username || profile?.full_name || 'Anonymous',
            total_score: score.total_score
          };
        });

        setEntries(entriesWithNames);
      } catch (error) {
        console.error('Error fetching mini leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopThree();
  }, [roundId]);

  const getRankEmoji = (position: number) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return position.toString();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-1.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-1 animate-pulse">
            <div className="w-4 h-4 bg-gray-700 rounded" />
            <div className="w-12 h-3 bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700/50">
      <div className="flex items-center justify-center gap-4 text-xs">
        {entries.map((entry) => (
          <div 
            key={entry.user_id} 
            className="flex items-center gap-1.5 min-w-0"
          >
            <span className="flex-shrink-0">{getRankEmoji(entry.position)}</span>
            <span className="text-gray-300 truncate max-w-[60px] sm:max-w-[80px]">
              {entry.username}
            </span>
            <span className="text-white font-semibold flex-shrink-0">
              {entry.total_score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
