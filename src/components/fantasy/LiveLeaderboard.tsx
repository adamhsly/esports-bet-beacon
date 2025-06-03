
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Medal, Award, TrendingUp, Users } from 'lucide-react';

interface LiveFantasyScore {
  id: string;
  fantasy_team_id: string;
  user_id: string;
  current_total_score: number;
  position_scores: any;
  last_calculated: string;
  fantasy_teams?: {
    team_name: string;
    user_id: string;
  };
}

interface LiveLeaderboardProps {
  sessionId: string;
  tournamentId: string;
}

export const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({ sessionId, tournamentId }) => {
  const [liveScores, setLiveScores] = useState<LiveFantasyScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      fetchLiveScores();
      setupRealtimeSubscriptions();
    }
  }, [sessionId]);

  const fetchLiveScores = async () => {
    try {
      const { data, error } = await supabase
        .from('live_fantasy_scores')
        .select(`
          *,
          fantasy_teams (
            team_name,
            user_id
          )
        `)
        .eq('session_id', sessionId)
        .order('current_total_score', { ascending: false });

      if (error) throw error;

      setLiveScores(data || []);
    } catch (error) {
      console.error('Error fetching live scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const channel = supabase
      .channel('live-leaderboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_fantasy_scores',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('Real-time leaderboard update:', payload);
          fetchLiveScores();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold">{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
      case 3:
        return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white';
      default:
        return 'bg-theme-gray-dark border-theme-gray-medium';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-purple"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Live Leaderboard
          <Badge className="animate-pulse">LIVE</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {liveScores.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No teams participating in this live session yet.</p>
            <p className="text-sm mt-2">Teams will appear here once the match starts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {liveScores.map((score, index) => {
              const rank = index + 1;
              return (
                <div
                  key={score.id}
                  className={`
                    p-4 rounded-lg border flex items-center justify-between
                    ${getRankColor(rank)}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getRankIcon(rank)}
                      <span className="font-bold">#{rank}</span>
                    </div>
                    
                    <div>
                      <div className="font-semibold">
                        {score.fantasy_teams?.team_name || 'Unknown Team'}
                      </div>
                      <div className={`text-sm ${rank <= 3 ? 'text-white/80' : 'text-gray-500'}`}>
                        Last updated: {formatTime(score.last_calculated)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {score.current_total_score.toFixed(1)} pts
                    </div>
                    <div className={`text-sm ${rank <= 3 ? 'text-white/80' : 'text-gray-500'}`}>
                      {rank === 1 ? '🏆 Leading' : 
                       rank === 2 ? '🥈 Second' : 
                       rank === 3 ? '🥉 Third' : 
                       `${rank}th Place`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {liveScores.length > 0 && (
          <div className="mt-6 p-4 bg-theme-gray-medium rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Live Updates
            </h4>
            <p className="text-sm text-gray-400">
              Scores update automatically as players perform in the live match. 
              Check back frequently to see how your team is doing!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
