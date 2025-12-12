import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Trophy, Medal, Users, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { TeamCard } from './TeamCard';
import { getEnhancedTeamLogoUrl } from '@/utils/teamLogoUtils';
import { RoundLeaderboard } from './RoundLeaderboard';
import { TeamPerformanceModal } from './TeamPerformanceModal';

interface FinishedRound {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  round_name: string | null;
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


export const FinishedRounds: React.FC = () => {
  const { user } = useAuth();
  const [rounds, setRounds] = useState<FinishedRound[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFinishedRounds();
    }
  }, [user]);

  const fetchFinishedRounds = async () => {
    if (!user) return;

    try {
      // Fetch user's picks for finished rounds (both 'finished' and 'closed' status)
      const { data: picks, error: picksError } = await supabase
        .from('fantasy_round_picks')
        .select(`
          *,
          fantasy_rounds!inner(*)
        `)
        .eq('user_id', user.id)
        .in('fantasy_rounds.status', ['finished', 'closed'])
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
            round_name: pick.fantasy_rounds.round_name,
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

      // Sort rounds by most recent end_date first
      const sortedRounds = roundsWithScores.sort((a, b) => 
        new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
      );
      setRounds(sortedRounds);
    } catch (error) {
      console.error('Error fetching finished rounds:', error);
      toast.error('Failed to load finished rounds');
    } finally {
      setLoading(false);
    }
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
      <Accordion type="multiple" defaultValue={rounds.length > 0 ? [rounds[0].id] : []} className="space-y-4">
        {rounds.map((round) => (
          <AccordionItem key={round.id} value={round.id} className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-gray-700/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-250 rounded-lg overflow-hidden">
            <AccordionTrigger className="px-4 sm:px-6 py-4 border-b border-gray-700/50 hover:no-underline">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-semibold">
                    {round.round_name || `${round.type.charAt(0).toUpperCase() + round.type.slice(1)} Round`}
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(round.end_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Trophy className="h-4 w-4" />
                    <span className="text-green-400 font-medium">{round.total_score} pts</span>
                  </span>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="p-4 sm:p-6 overflow-hidden">
              <div className="space-y-6">
                {/* Leaderboard */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-white">
                    <Trophy className="h-4 w-4" />
                    Round Leaderboard
                  </h4>
                  
                  <RoundLeaderboard roundId={round.id} />
                </div>

                {/* Team Performance */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-white">
                    <Users className="h-4 w-4" />
                    Final Team Performance
                  </h4>
                  
                  <FinishedTeamsList round={round} />
                </div>

                {/* Scoring Breakdown */}
                {round.scores.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-white">
                      <TrendingUp className="h-4 w-4" />
                      Final Scoring Breakdown
                    </h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 text-center">
                      <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/30">
                        <div className="text-lg sm:text-xl font-bold text-green-400">
                          {round.scores.reduce((sum, s) => sum + s.match_wins, 0)}
                        </div>
                        <div className="text-xs text-gray-400 leading-tight">Match Wins</div>
                      </div>
                      <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30">
                        <div className="text-lg sm:text-xl font-bold text-blue-400">
                          {round.scores.reduce((sum, s) => sum + s.map_wins, 0)}
                        </div>
                        <div className="text-xs text-gray-400 leading-tight">Map Wins</div>
                      </div>
                      <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30">
                        <div className="text-lg sm:text-xl font-bold text-purple-400">
                          {round.scores.reduce((sum, s) => sum + s.clean_sweeps, 0)}
                        </div>
                        <div className="text-xs text-gray-400 leading-tight">Clean Sweeps</div>
                      </div>
                      <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-400/30">
                        <div className="text-lg sm:text-xl font-bold text-orange-400">
                          {round.scores.reduce((sum, s) => sum + s.tournaments_won, 0)}
                        </div>
                        <div className="text-xs text-gray-400 leading-tight">Tournaments</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bench Team */}
                {round.bench_team && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm text-white">Bench Team</h4>
                    <Badge variant="outline" className="text-sm bg-orange-500/10 border-orange-400/30 text-orange-400">
                      {round.bench_team.name} (Amateur)
                    </Badge>
                  </div>
                )}

              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

// Helper component for rendering teams in finished rounds (no star functionality)
const FinishedTeamsList: React.FC<{ round: FinishedRound }> = ({ round }) => {
  const { user } = useAuth();
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<{ id: string; name: string; type: 'pro' | 'amateur' } | null>(null);

  const handleShowPerformance = (teamId: string, teamName: string, teamType: 'pro' | 'amateur') => {
    setSelectedTeam({ id: teamId, name: teamName, type: teamType });
    setShowPerformanceModal(true);
  };

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
      {round.scores.length > 0 ? (
        // Show scored teams
        round.scores.map((score) => {
          // Find original team data to get logo_url
          const originalTeam = round.team_picks.find(team => team.id === score.team_id);
          return (
            <TeamCard 
              key={score.team_id}
              team={{
                id: score.team_id,
                name: score.team_name,
                type: score.team_type,
                logo_url: originalTeam?.logo_url || ''
              }}
            isSelected={true}
            onClick={() => {}}
            showStarToggle={false} // No star functionality for finished rounds
            variant="progress"
            fantasyPoints={score.current_score}
            onShowPerformance={handleShowPerformance}
          />
           );
        })
      ) : (
        // Show picked teams without scores
        round.team_picks.map((team, index) => (
          <TeamCard 
            key={team.id || index}
            team={team}
            isSelected={true}
            onClick={() => {}}
            showStarToggle={false} // No star functionality for finished rounds
            variant="progress"
            onShowPerformance={handleShowPerformance}
          />
        ))
      )}
      </div>

      {/* Team Performance Modal */}
      {selectedTeam && user && (
        <TeamPerformanceModal
          open={showPerformanceModal}
          onOpenChange={setShowPerformanceModal}
          teamId={selectedTeam.id}
          teamName={selectedTeam.name}
          teamType={selectedTeam.type}
          roundId={round.id}
          userId={user.id}
        />
      )}
    </>
  );
};