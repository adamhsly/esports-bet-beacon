import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, Users, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Round {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  status: 'open' | 'in_progress' | 'finished';
  total_score?: number;
  team_picks?: any[];
  bench_team?: any;
  scores?: FantasyScore[];
  leaderboard?: LeaderboardEntry[];
  user_rank?: number;
}

interface FantasyScore {
  team_id: string;
  team_name: string;
  team_type: 'pro' | 'amateur';
  current_score: number;
  match_wins: number;
  map_wins: number;
  tournaments_won: number;
  clean_sweeps: number;
  matches_played: number;
}

interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_score: number;
  rank: number;
}

export const RoundSelector: React.FC<{ onNavigateToInProgress?: () => void }> = ({ onNavigateToInProgress }) => {
  const { user } = useAuth();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOpenRounds();
  }, [user]);

  const fetchOpenRounds = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('fantasy_rounds')
        .select('*')
        .eq('status', 'open')
        .order('start_date', { ascending: true });

      if (error) throw error;

      setRounds(data || []);
    } catch (err) {
      console.error('Error fetching rounds:', err);
      toast.error('Failed to load rounds');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async (roundId: string) => {
    try {
      const { data, error } = await supabase
        .from('fantasy_round_picks')
        .select(`
          user_id,
          total_score,
          profiles:profiles(username)
        `)
        .eq('round_id', roundId)
        .order('total_score', { ascending: false });

      if (error) throw error;

      const leaderboard = (data || []).map((entry: any, index) => ({
        user_id: entry.user_id,
        username: entry.profiles?.[0]?.username || 'Anonymous',
        total_score: entry.total_score,
        rank: index + 1,
      }));

      const userRank = leaderboard.find((entry) => entry.user_id === user?.id)?.rank;

      return { leaderboard, userRank };
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      toast.error('Failed to load leaderboard');
      return { leaderboard: [], userRank: undefined };
    }
  };

  const handleViewLeaderboard = async (roundId: string) => {
    if (selectedRound === roundId) {
      setSelectedRound(null);
      return;
    }

    const { leaderboard, userRank } = await fetchLeaderboard(roundId);

    setRounds((prev) =>
      prev.map((round) =>
        round.id === roundId
          ? { ...round, leaderboard, user_rank: userRank }
          : round
      )
    );

    setSelectedRound(roundId);
  };

  const getRoundTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return 'bg-blue-600 text-white';
      case 'weekly': return 'bg-green-600 text-white';
      case 'monthly': return 'bg-purple-600 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading rounds...</p>
      </div>
    );
  }

  if (!rounds.length) {
    return <p className="text-center text-muted-foreground">No open rounds available.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {rounds.map((round) => (
        <Card key={round.id}>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{round.type.charAt(0).toUpperCase() + round.type.slice(1)} Round</span>
              <Badge className={getRoundTypeColor(round.type)}>{round.type}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p>
                <Calendar className="inline mr-2" />{' '}
                {new Date(round.start_date).toLocaleDateString()} - {new Date(round.end_date).toLocaleDateString()}
              </p>
            </div>
            <Button onClick={() => handleViewLeaderboard(round.id)}>
              {selectedRound === round.id ? 'Hide Leaderboard' : 'View Leaderboard'}
            </Button>

            {selectedRound === round.id && round.leaderboard && (
              <div className="mt-4 border-t pt-2">
                {round.leaderboard.slice(0, 10).map((entry) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center justify-between px-4 py-2 ${
                      entry.user_id === user?.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <span>{entry.rank}. {entry.username}</span>
                    <span>{entry.total_score} pts</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
