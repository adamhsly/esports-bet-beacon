import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Trophy, Users, Star, TrendingUp, Calendar, Target, Clock, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MatchBreakdown {
  match_id: string;
  match_date: string;
  opponent_name: string;
  opponent_logo?: string;
  result: 'win' | 'loss' | 'tie';
  score: string;
  points_earned: number;
  match_type: 'pro' | 'amateur';
  tournament_name?: string;
  is_clean_sweep: boolean;
  is_tournament_win: boolean;
}

interface UpcomingMatch {
  match_id: string;
  match_date: string;
  opponent_name: string;
  opponent_logo?: string;
  status: string;
  tournament_name?: string;
}

interface TeamPerformanceData {
  team_name: string;
  team_type: 'pro' | 'amateur';
  total_points: number;
  is_star_team: boolean;
  match_wins: number;
  map_wins: number;
  clean_sweeps: number;
  tournaments_won: number;
  matches: MatchBreakdown[];
  upcoming_matches?: UpcomingMatch[];
}

interface TeamPerformanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  teamType: 'pro' | 'amateur';
  roundId: string;
  userId: string;
}

export const TeamPerformanceModal: React.FC<TeamPerformanceModalProps> = ({
  open,
  onOpenChange,
  teamId,
  teamName,
  teamType,
  roundId,
  userId,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TeamPerformanceData | null>(null);

  useEffect(() => {
    if (open) {
      fetchTeamPerformance();
    }
  }, [open, teamId, roundId, userId]);

  const fetchTeamPerformance = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('get-team-match-breakdown', {
        body: {
          team_id: teamId,
          team_type: teamType,
          round_id: roundId,
          user_id: userId,
        },
      });

      if (error) throw error;
      setData(result);
    } catch (error: any) {
      console.error('Error fetching team performance:', error);
      toast.error('Failed to load team performance');
    } finally {
      setLoading(false);
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win':
        return 'text-green-400 bg-green-500/10 border-green-400/30';
      case 'loss':
        return 'text-red-400 bg-red-500/10 border-red-400/30';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-400/30';
    }
  };

  const isAmateur = teamType === 'amateur';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-gray-700/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {isAmateur ? (
              <Users className="h-5 w-5 text-orange-400" />
            ) : (
              <Trophy className="h-5 w-5 text-blue-400" />
            )}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {teamName}
            </span>
          </DialogTitle>
          <DialogDescription>
            Match-by-match breakdown for this fantasy round
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading performance data...</p>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30">
                <div className="text-2xl font-bold text-blue-400">{data.total_points}</div>
                <div className="text-xs text-gray-400">Total Points</div>
                {data.is_star_team && (
                  <Badge className="mt-1 text-xs bg-[#F5C042] text-black border-[#F5C042]/50">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    2x Multiplier
                  </Badge>
                )}
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-gray-700/30 to-gray-800/30 border border-gray-600/30">
                <div className="text-2xl font-bold text-white">{data.matches.length}</div>
                <div className="text-xs text-gray-400">Matches Played</div>
                {isAmateur && (
                  <Badge className="mt-1 text-xs bg-gradient-to-r from-orange-500 to-red-500 text-white border-orange-400/50">
                    +25% Bonus
                  </Badge>
                )}
              </div>
            </div>

            {/* Scoring Breakdown */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/30">
                <div className="text-lg font-bold text-green-400">{data.match_wins}</div>
                <div className="text-xs text-gray-400">Match Wins</div>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30">
                <div className="text-lg font-bold text-blue-400">{data.map_wins}</div>
                <div className="text-xs text-gray-400">Map Wins</div>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30">
                <div className="text-lg font-bold text-purple-400">{data.clean_sweeps}</div>
                <div className="text-xs text-gray-400">Clean Sweeps</div>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-400/30">
                <div className="text-lg font-bold text-orange-400">{data.tournaments_won}</div>
                <div className="text-xs text-gray-400">Tournaments</div>
              </div>
            </div>

            <Separator className="bg-gray-700/50" />

            {/* Match List */}
            <div>
              <ScrollArea className="h-[300px] pr-4">
                {/* Upcoming Matches Section */}
                {data.upcoming_matches && data.upcoming_matches.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-blue-400">
                      <CalendarClock className="h-4 w-4" />
                      Upcoming Matches ({data.upcoming_matches.length})
                    </h4>
                    <div className="space-y-3">
                      {data.upcoming_matches.map((match) => (
                        <div
                          key={match.match_id}
                          className="p-3 rounded-lg bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/40 hover:border-blue-600/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-400/30">
                              {match.status === 'running' ? 'LIVE' : 'SCHEDULED'}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              {match.opponent_logo && (
                                <img src={match.opponent_logo} alt="" className="w-6 h-6 object-contain" />
                              )}
                              <div>
                                <div className="text-white font-medium">vs {match.opponent_name}</div>
                                <div className="text-xs text-gray-400">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  {new Date(match.match_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })} • {new Date(match.match_date).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </div>
                            </div>
                            {match.tournament_name && (
                              <div className="text-xs text-gray-400 truncate max-w-[120px] text-right">
                                {match.tournament_name}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Match History Section */}
                {data.matches.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-white">
                      <Target className="h-4 w-4" />
                      Match History ({data.matches.length})
                    </h4>
                    <div className="space-y-3">
                      {data.matches.map((match) => (
                        <div
                          key={match.match_id}
                          className="p-3 rounded-lg bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700/50 hover:border-gray-600/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs ${getResultColor(match.result)}`}>
                                {match.result.toUpperCase()}
                              </Badge>
                              {match.is_clean_sweep && (
                                <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-400/30">
                                  Clean Sweep
                                </Badge>
                              )}
                              {match.is_tournament_win && (
                                <Badge className="text-xs bg-orange-500/20 text-orange-400 border-orange-400/30">
                                  Tournament Win
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm font-bold text-blue-400">
                              +{match.points_earned} pts
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <div>
                              <div className="text-white font-medium">vs {match.opponent_name}</div>
                              <div className="text-xs text-gray-400">
                                <Calendar className="h-3 w-3 inline mr-1" />
                                {new Date(match.match_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-medium">{match.score}</div>
                              {match.tournament_name && (
                                <div className="text-xs text-gray-400 truncate max-w-[150px]">
                                  {match.tournament_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Empty state - no matches at all */}
                {data.matches.length === 0 && (!data.upcoming_matches || data.upcoming_matches.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No scheduled matches found in this round
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">No data available</div>
        )}
      </DialogContent>
    </Dialog>
  );
};
