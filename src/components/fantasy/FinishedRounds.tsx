import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, Users, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FinishedRound {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  total_score: number;
  team_picks: any[];
  bench_team: any;
  scores: FantasyScore[];
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

export const FinishedRounds: React.FC = () => {
  const { user } = useAuth();
  const [rounds, setRounds] = useState<FinishedRound[]>([]);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFinishedRounds();
    }
  }, [user]);

  const fetchFinishedRounds = async () => {
    if (!user) return;

    try {
      // Fetch user's picks for finished rounds
      const { data: picks, error: picksError } = await supabase
        .from('fantasy_round_picks')
        .select(`
          *,
          fantasy_rounds!inner(*)
        `)
        .eq('user_id', user.id)
        .eq('fantasy_rounds.status', 'finished')
        .order('created_at', { ascending: false });

      if (picksError) throw picksError;

      // Fetch scores for each round
      const roundsWithScores = await Promise.all(
        (picks || []).map(async (pick) => {
          const { data: scores, error: scoresError } = await supabase
            .from('fantasy_round_scores')
            .select('*')
            .eq('round_id', pick.round_id)
            .eq('user_id', user.id);

          if (scoresError) throw scoresError;

          return {
            id: pick.round_id,
            type: pick.fantasy_rounds.type as 'daily' | 'weekly' | 'monthly',
            start_date: pick.fantasy_rounds.start_date,
            end_date: pick.fantasy_rounds.end_date,
            total_score: pick.total_score,
            team_picks: Array.isArray(pick.team_picks) ? pick.team_picks : [],
            bench_team: pick.bench_team,
            scores: (scores || []).map(score => ({
              ...score,
              team_type: score.team_type as 'pro' | 'amateur'
            }))
          };
        })
      );

      setRounds(roundsWithScores);
    } catch (error) {
      console.error('Error fetching finished rounds:', error);
      toast.error('Failed to load finished rounds');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async (roundId: string) => {
    try {
      // Get all participants for this round with their scores
      const { data: leaderboard, error } = await supabase
        .from('fantasy_round_picks')
        .select(`
          user_id,
          total_score,
          profiles:profiles(username)
        `)
        .eq('round_id', roundId)
        .order('total_score', { ascending: false });

      if (error) throw error;

      const leaderboardWithRanks = (leaderboard || []).map((entry: any, index) => ({
        user_id: entry.user_id,
        username: entry.profiles?.[0]?.username || 'Anonymous',
        total_score: entry.total_score,
        rank: index + 1
      }));

      const userRank = leaderboardWithRanks.find(entry => entry.user_id === user?.id)?.rank;

      return { leaderboard: leaderboardWithRanks, userRank };
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
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
    
    setRounds(rounds.map(round => 
      round.id === roundId 
        ? { ...round, leaderboard, user_rank: userRank }
        : round
    ));
    
    setSelectedRound(roundId);
  };

  const getRoundTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return 'bg-blue-600 text-white';
      case 'weekly': return 'bg-green-600 text-white';
      case 'monthly': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
    if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />;
    return <span className="text-sm font-medium w-4 text-center">{rank}</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading your finished rounds...</p>
      </div>
    );
  }

  if (rounds.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="text-center py-12">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No Finished Rounds</h3>
          <p className="text-muted-foreground">
            You haven't completed any fantasy rounds yet. Join a round to start competing!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Finished Rounds</h2>
        <p className="text-muted-foreground">
          Review your completed fantasy rounds and see how you ranked against other players.
        </p>
      </div>

      <div className="space-y-6">
        {rounds.map((round) => (
          <Card key={round.id} className="bg-card border-border hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl capitalize">{round.type} Round</CardTitle>
                  <Badge className={getRoundTypeColor(round.type)}>
                    {round.type}
                  </Badge>
                  {round.user_rank && round.user_rank <= 3 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getRankIcon(round.user_rank)}
                      #{round.user_rank}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(round.end_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Trophy className="h-4 w-4" />
                    {round.total_score} pts
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-6">
                {/* Team Performance */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Final Team Performance
                  </h4>
                  
                  {round.scores.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No scoring data available</p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {round.scores.map((score) => (
                        <div 
                          key={score.team_id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <div className="font-medium">{score.team_name}</div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant={score.team_type === 'pro' ? 'default' : 'secondary'} className="text-xs">
                                {score.team_type}
                              </Badge>
                              {score.team_type === 'amateur' && (
                                <Badge variant="outline" className="text-xs text-green-600">
                                  +25% bonus
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-lg font-bold text-primary">
                              {score.current_score} pts
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {score.matches_played} matches
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Scoring Breakdown */}
                {round.scores.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Final Scoring Breakdown
                    </h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xl font-bold text-green-600">
                          {round.scores.reduce((sum, s) => sum + s.match_wins, 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Match Wins</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xl font-bold text-blue-600">
                          {round.scores.reduce((sum, s) => sum + s.map_wins, 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Map Wins</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xl font-bold text-purple-600">
                          {round.scores.reduce((sum, s) => sum + s.clean_sweeps, 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Clean Sweeps</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xl font-bold text-orange-600">
                          {round.scores.reduce((sum, s) => sum + s.tournaments_won, 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Tournaments</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Leaderboard */}
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Leaderboard
                  </h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewLeaderboard(round.id)}
                  >
                    {selectedRound === round.id ? 'Hide Leaderboard' : 'View Leaderboard'}
                  </Button>
                </div>

                {selectedRound === round.id && round.leaderboard && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-2 text-sm font-medium border-b">
                      Top Players
                    </div>
                    <div className="divide-y max-h-60 overflow-y-auto">
                      {round.leaderboard.slice(0, 10).map((entry) => (
                        <div 
                          key={entry.user_id}
                           className={`flex items-center justify-between px-4 py-3 ${
                             entry.user_id === user?.id ? 'bg-primary/10' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {getRankIcon(entry.rank)}
                            <span className="font-medium">{entry.username}</span>
                            {entry.user_id === user?.id && (
                              <Badge variant="secondary" className="text-xs">You</Badge>
                            )}
                          </div>
                          <span className="font-semibold">{entry.total_score} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};