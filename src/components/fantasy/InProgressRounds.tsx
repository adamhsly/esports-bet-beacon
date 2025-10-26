import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Clock, Trophy, TrendingUp, Users, Star, Lock, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { TeamCard } from './TeamCard';
import { StarTeamConfirmModal } from './StarTeamConfirmModal';
import { useRoundStar } from '@/hooks/useRoundStar';
import { RoundLeaderboard } from './RoundLeaderboard';
import { renderShareCard } from '@/utils/shareCardRenderer';
import { getEnhancedTeamLogoUrl } from '@/utils/teamLogoUtils';
import { copyToClipboard } from '@/utils/copy';

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

  const calculateScores = async () => {
    try {
      console.log('🎯 Triggering fantasy score calculation...');
      const { error } = await supabase.functions.invoke('calculate-fantasy-scores', {
        body: { user_id: user?.id }
      });
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
      await calculateScores();

      const { data: picks, error: picksError } = await supabase
        .from('fantasy_round_picks')
        .select(`*, fantasy_rounds!inner(*)`)
        .eq('user_id', user.id)
        .in('fantasy_rounds.status', ['open', 'active']);
      if (picksError) throw picksError;
      console.log('Fantasy picks fetched:', picks);

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
            scores: (scores || []).map((score) => ({
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
      case 'daily':
        return 'bg-blue-600 text-white';
      case 'weekly':
        return 'bg-green-600 text-white';
      case 'monthly':
        return 'bg-primary text-primary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
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
      <div className="space-y-6">
        {rounds.map((round) => (
          <Card
            key={round.id}
            className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-gray-700/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-250"
          >
            <CardHeader className="border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl capitalize bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    {round.type} Round
                  </CardTitle>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatTimeRemaining(round.end_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Trophy className="h-4 w-4" />
                    <span className="text-green-400 font-medium">{round.total_score} pts</span>
                  </span>
                  <ShareButton roundId={round.id} userId={user?.id} roundType={round.type} />
                </div>
              </div>
              <Progress
                value={calculateProgress(round.start_date, round.end_date)}
                className="h-2 bg-gray-800/50 [&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-purple-500"
              />
            </CardHeader>

            <CardContent className="p-4 sm:p-6 overflow-hidden">
              <div className="space-y-6">
                {/* Team Performance */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-white">
                    <Users className="h-4 w-4" />
                    Team Performance
                  </h4>

                  <InProgressTeamsList round={round} />
                </div>

                {/* Leaderboard */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-white">
                    <Trophy className="h-4 w-4" />
                    Round Leaderboard
                  </h4>

                  <RoundLeaderboard roundId={round.id} />
                </div>

                {/* Scoring Breakdown */}
                {round.scores.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-white">
                      <TrendingUp className="h-4 w-4" />
                      Scoring Breakdown
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Helper component for rendering teams in progress rounds
const InProgressTeamsList: React.FC<{ round: InProgressRound }> = ({ round }) => {
  const { starTeamId, changeUsed, canChange, setStarTeam } = useRoundStar(round.id);
  const [showStarModal, setShowStarModal] = useState(false);
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);

  const handleStarToggle = (teamId: string) => {
    if (!canChange) return;
    if (starTeamId === teamId) return;
    setPendingTeamId(teamId);
    setShowStarModal(true);
  };

  const handleConfirmStarChange = async () => {
    if (!pendingTeamId) return;
    const result = await setStarTeam(pendingTeamId);
    if (result.success) {
      toast.success('Star Team updated!');
    } else {
      toast.error(result.error || 'Failed to update Star Team');
    }
    setShowStarModal(false);
    setPendingTeamId(null);
  };

  const getStarTeamName = () => {
    if (!starTeamId) return 'None';
    if (round.scores.length > 0) {
      const team = round.scores.find((s) => s.team_id === starTeamId);
      return team?.team_name || 'Unknown';
    } else {
      const team = round.team_picks.find((t) => t.id === starTeamId);
      return team?.name || 'Unknown';
    }
  };

  return (
    <>
      {/* Star Team Status */}
      <div className="mb-4 p-3 rounded-lg bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700/50">
        <div className="flex items-center gap-2 text-sm">
          <Star className={`h-4 w-4 ${starTeamId ? 'text-[#F5C042] fill-current' : 'text-gray-400'}`} />
          <span className="text-gray-300">
            Star Team: <span className="text-white font-medium">{getStarTeamName()}</span> •
            Change left: <span className="text-white font-medium">{changeUsed ? '0/1' : '1/1'}</span>
          </span>
          {!canChange && (
            <div className="flex items-center gap-1 ml-2">
              <Lock className="h-3 w-3 text-orange-400" />
              <span className="text-xs text-orange-400">Star change used</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {round.scores.length > 0
          ? round.scores.map((score) => (
              <TeamCard
                key={score.team_id}
                team={{
                  id: score.team_id,
                  name: score.team_name,
                  type: score.team_type,
                  logo_url: round.team_picks.find((team) => team.id === score.team_id)?.logo_url || ''
                }}
                isSelected={true}
                onClick={() => {}}
                showStarToggle={true}
                isStarred={starTeamId === score.team_id}
                onToggleStar={() => handleStarToggle(score.team_id)}
                disabledReason={!canChange ? 'Star change used' : null}
                variant="progress"
                fantasyPoints={score.current_score}
              />
            ))
          : round.team_picks.map((team, index) => (
              <TeamCard
                key={team.id || index}
                team={team}
                isSelected={true}
                onClick={() => {}}
                showStarToggle={true}
                isStarred={starTeamId === team.id}
                onToggleStar={() => handleStarToggle(team.id)}
                disabledReason={!canChange ? 'Star change used' : null}
                variant="progress"
              />
            ))}
      </div>

      {/* Star Change Modal */}
      <StarTeamConfirmModal
        open={showStarModal}
        onOpenChange={setShowStarModal}
        title="Change Star Team?"
        description="You can change your Star Team only once per round. The new Star Team will score double points from now on."
        onConfirm={handleConfirmStarChange}
        onCancel={() => {
          setShowStarModal(false);
          setPendingTeamId(null);
        }}
        confirmText="Confirm Change"
        cancelText="Cancel"
      />
    </>
  );
};

// Share Button Component
const ShareButton: React.FC<{
  roundId: string;
  userId?: string;
  roundType: string;
}> = ({ roundId, userId, roundType }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleShare = async () => {
    if (!userId) return;
    
    const shareUrl = `${window.location.origin}/lineup/${roundId}/${userId}`;
    const roundName = `${roundType.charAt(0).toUpperCase() + roundType.slice(1)} Round`;
    
    // Try native Web Share API with URL first (immediate, within user gesture)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Fantasy Picks',
          text: `My ${roundName} picks - Check out my live progress!`,
          url: shareUrl
        });
        
        // Track missions on successful share
        try {
          const { MissionBus } = await import('@/lib/missionBus');
          MissionBus.onShareLineup(roundId);
          MissionBus.onShareThisWeek();
        } catch (e) {
          console.warn('Mission share tracking failed', e);
        }
        
        toast.success('Shared!');
        
        // Generate share card in background for future use
        renderShareCard(roundId, userId).catch(console.warn);
        return;
      } catch (shareError) {
        if ((shareError as Error).name === 'AbortError') return; // user cancelled
        // Fall through to copy fallback
      }
    }
    
    // Fallback: Copy link immediately (within user gesture window)
    const linkCopied = await copyToClipboard(shareUrl);
    
    if (linkCopied) {
      toast.success('Link copied to clipboard!');
      
      // Track missions
      try {
        const { MissionBus } = await import('@/lib/missionBus');
        MissionBus.onShareLineup(roundId);
        MissionBus.onShareThisWeek();
      } catch (e) {
        console.warn('Mission share tracking failed', e);
      }
      
      // Generate share card in background
      setIsGenerating(true);
      renderShareCard(roundId, userId)
        .catch(console.warn)
        .finally(() => setIsGenerating(false));
    } else {
      toast.error('Could not copy. Long-press/tap the link to copy.');
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleShare}
      disabled={isGenerating || !userId}
      className="h-8 px-2 text-gray-400 hover:text-white hover:bg-gray-700/50"
    >
      <Share2 className="h-4 w-4" />
      {isGenerating && <span className="ml-1 text-xs">Sharing...</span>}
    </Button>
  );
};
