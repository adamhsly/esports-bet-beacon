import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Trophy, TrendingUp, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface InProgressRound {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  total_score: number;
  team_picks: any[];
  bench_team: any;
  scores: FantasyScore[];
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

export const InProgressRounds: React.FC = () => {
  const { user } = useAuth();
  const [rounds, setRounds] = useState<InProgressRound[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchInProgressRounds();
    }
  }, [user]);

  const updateRoundStatus = async () => {
    try {
      console.log('🕐 Updating fantasy round status...');
      const { error } = await supabase.functions.invoke('update-fantasy-round-status');
      if (error) {
        console.error('Error updating round status:', error);
      } else {
        console.log('✅ Round status updated successfully');
      }
    } catch (error) {
      console.error('Error invoking round status update:', error);
    }
  };

  const calculateScores = async () => {
    try {
      console.log('🎯 Triggering fantasy score calculation...');
      const { error } = await supabase.functions.invoke('calculate-fantasy-scores');
      if (error) {
        console.error('Error calculating scores:', error);
        toast.error('Failed to calculate scores');
      } else {
        console.log('✅ Score calculation triggered successfully');
        toast.success('Scores updated!');
      }
    } catch (error) {
      console.error('Error invoking score calculation:', error);
      toast.error('Failed to trigger score calculation');
    }
  };

  const fetchInProgressRounds = async () => {
    if (!user) return;

    try {
      console.log('Fetching in-progress rounds for user:', user.id);
      
      // First update round statuses, then trigger score calculation
      await updateRoundStatus();
      await calculateScores();
      
      // Fetch user's picks for open and active rounds (rounds in progress)
      const { data: picks, error: picksError } = await supabase
        .from('fantasy_round_picks')
        .select(`
          *,
          fantasy_rounds!inner(*)
        `)
        .eq('user_id', user.id)
        .in('fantasy_rounds.status', ['open', 'active']);

      if (picksError) throw picksError;

      console.log('Fantasy picks fetched:', picks);

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

      console.log('Rounds with scores processed:', roundsWithScores);
      setRounds(roundsWithScores);
    } catch (error) {
      console.error('Error fetching in-progress rounds:', error);
      toast.error('Failed to load in-progress rounds');
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  const formatTimeRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h remaining`;
    return `${hours}h remaining`;
  };

  const getRoundTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return 'bg-blue-600 text-white';
      case 'weekly': return 'bg-green-600 text-white';
      case 'monthly': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading your active rounds...</p>
      </div>
    );
  }

  if (rounds.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="text-center py-12">
          <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No Active Rounds</h3>
          <p className="text-muted-foreground">
            You don't have any teams in active rounds. Join a round to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Your Active Rounds</h2>
        <p className="text-muted-foreground">
          Track your team performance in real-time across all active fantasy rounds.
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
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatTimeRemaining(round.end_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Trophy className="h-4 w-4" />
                    {round.total_score} pts
                  </span>
                </div>
              </div>
              <Progress value={calculateProgress(round.start_date, round.end_date)} className="h-2" />
            </CardHeader>

            <CardContent>
              <div className="space-y-6">
                {/* Team Performance */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team Performance
                  </h4>
                  
                  <div className="grid gap-3 md:grid-cols-2">
                    {round.scores.length > 0 ? (
                      // Show scored teams
                      round.scores.map((score) => (
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
                              {score.matches_played} matches played
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      // Show picked teams without scores
                      round.team_picks.map((team, index) => (
                        <div 
                          key={team.id || index}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            {team.logo_url && (
                              <img 
                                src={team.logo_url} 
                                alt={team.name}
                                className="w-8 h-8 rounded object-contain"
                              />
                            )}
                            <div>
                              <div className="font-medium">{team.name}</div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant={team.type === 'pro' ? 'default' : 'secondary'} className="text-xs">
                                  {team.type}
                                </Badge>
                                {team.type === 'amateur' && (
                                  <Badge variant="outline" className="text-xs text-green-600">
                                    +25% bonus
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">
                              Waiting for matches...
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Scoring Breakdown */}
                {round.scores.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Scoring Breakdown
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

                {/* Bench Team */}
                {round.bench_team && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">Bench Team</h4>
                    <Badge variant="outline" className="text-sm">
                      {round.bench_team.name} (Amateur)
                    </Badge>
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