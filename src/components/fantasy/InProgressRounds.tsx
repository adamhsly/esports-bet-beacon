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
import { useRoundTeamSwap } from '@/hooks/useRoundTeamSwap';
import { RoundLeaderboard } from './RoundLeaderboard';
import { renderShareCard } from '@/utils/shareCardRenderer';
import { getEnhancedTeamLogoUrl } from '@/utils/teamLogoUtils';
import { ShareSheet } from './ShareSheet';
import { useMobile } from '@/hooks/useMobile';
import { TeamPerformanceModal } from './TeamPerformanceModal';
import { MultiTeamSelectionSheet } from './MultiTeamSelectionSheet';
import { TeamSwapConfirmModal } from './TeamSwapConfirmModal';

interface InProgressRound {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'private';
  start_date: string;
  end_date: string;
  total_score: number;
  team_picks: any[];
  bench_team: any;
  scores: FantasyScore[];
  is_private: boolean;
  round_name: string | null;
  status: 'scheduled' | 'open' | 'active';
  game_type?: string;
  team_type?: 'pro' | 'amateur' | 'both';
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

  const fetchInProgressRounds = async () => {
    if (!user) return;
    try {
      console.log('Fetching in-progress rounds for user:', user.id);

      // Include scheduled rounds in the fetch
      const { data: picks, error: picksError } = await supabase
        .from('fantasy_round_picks')
        .select(`*, fantasy_rounds!inner(*)`)
        .eq('user_id', user.id)
        .in('fantasy_rounds.status', ['scheduled', 'open', 'active']);
      if (picksError) throw picksError;
      console.log('Fantasy picks fetched:', picks);

      const roundsWithScores = await Promise.all(
        (picks || []).map(async (pick) => {
          // Only fetch scores for non-scheduled rounds
          const roundStatus = pick.fantasy_rounds.status;
          let scores: FantasyScore[] = [];
          
          if (roundStatus !== 'scheduled') {
            // First try fantasy_round_scores
            const { data: scoresData, error: scoresError } = await supabase
              .from('fantasy_round_scores')
              .select('*')
              .eq('round_id', pick.round_id)
              .eq('user_id', user.id);

            if (scoresError) throw scoresError;
            
            if (scoresData && scoresData.length > 0) {
              scores = scoresData.map((score) => ({
                ...score,
                team_type: score.team_type as 'pro' | 'amateur'
              }));
            } else {
              // Fallback: aggregate scores from fantasy_team_match_breakdown
              const { data: breakdowns } = await supabase
                .from('fantasy_team_match_breakdown')
                .select('*')
                .eq('round_id', pick.round_id)
                .eq('user_id', user.id);
              
              if (breakdowns && breakdowns.length > 0) {
                // Group by team_id and aggregate
                const teamScores = new Map<string, FantasyScore>();
                for (const b of breakdowns) {
                  const existing = teamScores.get(b.team_id);
                  if (existing) {
                    existing.current_score += b.points_earned || 0;
                    existing.match_wins += b.result === 'win' ? 1 : 0;
                    existing.map_wins += b.map_wins || 0;
                    existing.clean_sweeps += b.is_clean_sweep ? 1 : 0;
                    existing.tournaments_won += b.is_tournament_win ? 1 : 0;
                    existing.matches_played += 1;
                  } else {
                    teamScores.set(b.team_id, {
                      team_id: b.team_id,
                      team_name: b.team_name,
                      team_type: b.team_type as 'pro' | 'amateur',
                      current_score: b.points_earned || 0,
                      match_wins: b.result === 'win' ? 1 : 0,
                      map_wins: b.map_wins || 0,
                      clean_sweeps: b.is_clean_sweep ? 1 : 0,
                      tournaments_won: b.is_tournament_win ? 1 : 0,
                      matches_played: 1,
                    });
                  }
                }
                scores = Array.from(teamScores.values());
              }
            }
          }

          // Calculate total score from individual team scores, but use pick.total_score as authoritative fallback
          const calculatedTotalScore = scores.reduce((sum, s) => sum + (s.current_score || 0), 0);
          const pickTotalScore = typeof pick.total_score === 'number' ? pick.total_score : 0;
          // Use the higher of the two (pick.total_score is the source of truth from the scoring job)
          const finalTotalScore = roundStatus === 'scheduled' ? 0 : Math.max(calculatedTotalScore, pickTotalScore);

          return {
            id: pick.round_id,
            type: pick.fantasy_rounds.type as 'daily' | 'weekly' | 'monthly' | 'private',
            start_date: pick.fantasy_rounds.start_date,
            end_date: pick.fantasy_rounds.end_date,
            total_score: finalTotalScore,
            team_picks: Array.isArray(pick.team_picks) ? pick.team_picks : [],
            bench_team: pick.bench_team,
            is_private: pick.fantasy_rounds.is_private || false,
            round_name: pick.fantasy_rounds.round_name || null,
            status: roundStatus as 'scheduled' | 'open' | 'active',
            game_type: pick.fantasy_rounds.game_type,
            team_type: pick.fantasy_rounds.team_type as 'pro' | 'amateur' | 'both' | undefined,
            scores
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

  // Separate active/open rounds from scheduled rounds, sorted by end date (closest first)
  const activeRounds = rounds
    .filter(r => r.status !== 'scheduled')
    .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());
  const scheduledRounds = rounds
    .filter(r => r.status === 'scheduled')
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  // Helper to format time until start for scheduled rounds
  const formatTimeUntilStart = (startDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const diff = start.getTime() - now.getTime();
    if (diff <= 0) return 'Starting soon';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `Starts in ${days}d ${hours % 24}h`;
    return `Starts in ${hours}h`;
  };

  return (
    <div className="space-y-8">
      {/* Active/Open Rounds */}
      {activeRounds.length > 0 && (
        <div className="space-y-6">
          {activeRounds.map((round) => (
            <Card
              key={round.id}
              className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-gray-700/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-250"
            >
              <CardHeader className="border-b border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl capitalize bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      {round.is_private && round.round_name ? round.round_name : round.round_name || `${round.type} Round`}
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

                    <InProgressTeamsList round={round} onRefresh={fetchInProgressRounds} />
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
      )}

      {/* Coming Soon - Scheduled Rounds */}
      {scheduledRounds.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-400" />
            Coming Soon
          </h3>
          <div className="space-y-4">
            {scheduledRounds.map((round) => (
              <Card
                key={round.id}
                className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-yellow-700/30 hover:shadow-lg hover:shadow-yellow-500/10 transition-all duration-250"
              >
                <CardHeader className="border-b border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl capitalize bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                        {round.round_name || `${round.type} Round`}
                      </CardTitle>
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        Scheduled
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-yellow-400" />
                        <span className="text-yellow-400">{formatTimeUntilStart(round.start_date)}</span>
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-4">
                    {/* Teams submitted */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-white">
                        <Users className="h-4 w-4" />
                        Your Teams
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {round.team_picks.map((team: any, index: number) => (
                          <div 
                            key={team.id || index}
                            className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 text-center"
                          >
                            {team.logo_url && (
                              <img 
                                src={team.logo_url} 
                                alt={team.name} 
                                className="w-8 h-8 object-contain mx-auto mb-2"
                              />
                            )}
                            <p className="text-sm font-medium text-white truncate">{team.name}</p>
                            <p className="text-xs text-gray-400">{team.type === 'pro' ? 'Pro' : 'Amateur'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Scoring notice */}
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <p className="text-sm text-yellow-400 text-center">
                        Scoring will begin when the round starts on {new Date(round.start_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for rendering teams in progress rounds
const InProgressTeamsList: React.FC<{ round: InProgressRound; onRefresh: () => Promise<void> }> = ({ round, onRefresh }) => {
  const { user } = useAuth();
  const { starTeamId, changeUsed, canChange, setStarTeam } = useRoundStar(round.id);
  const { swapUsed, canSwap, oldTeamId, oldTeamName, oldTeamType, newTeamId, pointsAtSwap, swapTeam, refresh } = useRoundTeamSwap(round.id);
  const [showStarModal, setShowStarModal] = useState(false);
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<{ id: string; name: string; type: 'pro' | 'amateur' } | null>(null);
  
  // Swap state
  const [showSwapSheet, setShowSwapSheet] = useState(false);
  const [swappingTeam, setSwappingTeam] = useState<{ id: string; name: string; type: 'pro' | 'amateur'; price: number; currentPoints: number } | null>(null);
  const [showSwapConfirmModal, setShowSwapConfirmModal] = useState(false);
  const [selectedNewTeam, setSelectedNewTeam] = useState<any>(null);
  const [proTeams, setProTeams] = useState<any[]>([]);
  const [amateurTeams, setAmateurTeams] = useState<any[]>([]);
  
  // Upcoming match counts state
  const [upcomingMatchCounts, setUpcomingMatchCounts] = useState<Record<string, number>>({});

  // Fetch upcoming match counts for all teams
  useEffect(() => {
    const fetchUpcomingMatchCounts = async () => {
      const pickTeamIds = (round.team_picks || [])
        .map((t: any) => String(t?.id ?? t?.team_id ?? t?.teamId ?? ''))
        .filter((id: string) => !!id);

      if (pickTeamIds.length === 0) return;

      const now = new Date().toISOString();
      const roundEnd = round.end_date;

      // Fetch only UPCOMING matches (from now, not from round start) to limit data
      const { data: upcomingMatches, error } = await supabase
        .from('pandascore_matches')
        .select('teams')
        .gte('start_time', now)
        .lte('start_time', roundEnd)
        .in('status', ['not_started', 'running']);
      
      if (error) {
        console.error('Error fetching upcoming matches:', error);
        return;
      }
      
      // Count matches per team by team ID
      // Handle both formats: {id, name} and {opponent: {id, name}}
      const pickIdSet = new Set(pickTeamIds);
      const counts: Record<string, number> = Object.fromEntries(pickTeamIds.map((id) => [id, 0]));

      for (const match of (upcomingMatches || [])) {
        const teams = match.teams as any;
        if (!Array.isArray(teams)) continue;

        for (const t of teams) {
          // Handle both formats: direct {id} or nested {opponent: {id}}
          const teamId = t?.opponent?.id ?? t?.id;
          if (teamId == null) continue;
          const idStr = String(teamId);
          if (pickIdSet.has(idStr)) {
            counts[idStr] = (counts[idStr] ?? 0) + 1;
          }
        }
      }

      console.log('Upcoming match counts:', counts, 'from', upcomingMatches?.length, 'matches');
      setUpcomingMatchCounts(counts);
    };
    
    fetchUpcomingMatchCounts();
  }, [round.id, round.team_picks, round.end_date]);

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

  const handleSwapTeam = async (teamId: string, teamName: string, teamType: 'pro' | 'amateur') => {
    if (!canSwap || swapUsed) {
      toast.error('Team swap already used for this round');
      return;
    }

    // Get current score for the team
    const currentScore = round.scores.find(s => s.team_id === teamId)?.current_score || 0;
    
    // Get team price
    const { data: priceData } = await supabase
      .from('fantasy_team_prices')
      .select('price')
      .eq('round_id', round.id)
      .eq('team_id', teamId)
      .single();
    
    const teamPrice = priceData?.price || 0;
    
    setSwappingTeam({
      id: teamId,
      name: teamName,
      type: teamType,
      price: teamPrice,
      currentPoints: currentScore
    });
    
    // Fetch available teams for swapping
    await fetchSwapTeams(teamPrice, teamId);
    setShowSwapSheet(true);
  };

  const fetchSwapTeams = async (maxBudget: number, excludeTeamId?: string) => {
    // Get all team IDs currently in the roster (excluding the team being swapped)
    const rosterTeamIds = round.team_picks
      .map((pick: any) => pick.team_id || pick.id)
      .filter((id: string) => id !== excludeTeamId);

    const { data: prices } = await supabase
      .from('fantasy_team_prices')
      .select('*')
      .eq('round_id', round.id)
      .lte('price', maxBudget);
    
    if (prices) {
      // Exclude the swapping team AND all other roster teams
      const filtered = prices.filter((p) => 
        p.team_id !== excludeTeamId && !rosterTeamIds.includes(p.team_id)
      );

      const pro = filtered.filter(p => p.team_type === 'pro');
      const amateur = filtered.filter(p => p.team_type === 'amateur');

      setProTeams(pro.map(p => ({ 
        id: p.team_id, 
        name: p.team_name, 
        type: 'pro' as const,
        price: p.price,
        recent_win_rate: p.recent_win_rate,
        match_volume: p.match_volume
      })));
      setAmateurTeams(amateur.map(p => ({ 
        id: p.team_id, 
        name: p.team_name, 
        type: 'amateur' as const,
        price: p.price,
        abandon_rate: p.abandon_rate,
        match_volume: p.match_volume
      })));
    }
  };

  const handleTeamSelection = (teams: any[]) => {
    if (teams.length === 1) {
      setSelectedNewTeam(teams[0]);
      setShowSwapSheet(false);
      setShowSwapConfirmModal(true);
    }
  };

  const handleConfirmSwap = async () => {
    if (!swappingTeam || !selectedNewTeam) return;

    const result = await swapTeam(
      swappingTeam.id,
      selectedNewTeam.id,
      swappingTeam.currentPoints
    );

    if (result.success) {
      toast.success('Team swapped successfully!');
      // Refresh data to show updated teams
      await refresh();
      await onRefresh();
    } else {
      toast.error(result.error || 'Failed to swap team');
    }

    setShowSwapConfirmModal(false);
    setSwappingTeam(null);
    setSelectedNewTeam(null);
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

  const handleShowPerformance = (teamId: string, teamName: string, teamType: 'pro' | 'amateur') => {
    setSelectedTeam({ id: teamId, name: teamName, type: teamType });
    setShowPerformanceModal(true);
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

      {/* Team Swap Status */}
      <div className="mb-4 p-3 rounded-lg bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700/50">
        <div className="flex items-center gap-2 text-sm">
          <Trophy className={`h-4 w-4 ${swapUsed ? 'text-gray-400' : 'text-blue-400'}`} />
          <span className="text-gray-300">
            Team Swap: <span className="text-white font-medium">{swapUsed ? 'Used' : 'Available'}</span> •
            Swaps left: <span className="text-white font-medium">{swapUsed ? '0/1' : '1/1'}</span>
          </span>
          {swapUsed && oldTeamId && newTeamId && (
            <div className="flex items-center gap-1 ml-2">
              <Lock className="h-3 w-3 text-orange-400" />
              <span className="text-xs text-orange-400">
                Swapped (preserved {pointsAtSwap} pts)
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(() => {
          // Build a merged list of teams to display
          const teamsToDisplay: Array<{
            id: string;
            name: string;
            type: 'pro' | 'amateur';
            logo_url: string;
            points: number;
            isSwappedOut: boolean;
            isSwappedIn: boolean;
            hasScore: boolean;
            upcoming_match_count: number;
          }> = [];
          
          const processedTeamIds = new Set<string>();
          
          // First, add teams from scores
          for (const score of round.scores) {
            const isSwappedOut = swapUsed && oldTeamId === score.team_id;
            const isSwappedIn = swapUsed && newTeamId === score.team_id;
            const teamPick = round.team_picks.find((t) => t.id === score.team_id);
            
            teamsToDisplay.push({
              id: score.team_id,
              name: score.team_name,
              type: score.team_type,
              logo_url: teamPick?.logo_url || '',
              points: isSwappedOut ? pointsAtSwap : score.current_score,
              isSwappedOut,
              isSwappedIn,
              hasScore: true,
              upcoming_match_count: upcomingMatchCounts[score.team_id] || 0,
            });
            processedTeamIds.add(score.team_id);
          }
          
          // Add teams from picks that don't have scores yet (e.g., newly swapped-in team)
          for (const team of round.team_picks) {
            if (!processedTeamIds.has(team.id)) {
              const isSwappedIn = swapUsed && newTeamId === team.id;
              teamsToDisplay.push({
                id: team.id,
                name: team.name,
                type: team.type as 'pro' | 'amateur',
                logo_url: team.logo_url || '',
                points: 0,
                isSwappedOut: false,
                isSwappedIn,
                hasScore: false,
                upcoming_match_count: upcomingMatchCounts[team.id] || 0,
              });
              processedTeamIds.add(team.id);
            }
          }
          
          // If there was a swap, ensure the old team is displayed (greyed out with preserved points)
          if (swapUsed && oldTeamId && !processedTeamIds.has(oldTeamId)) {
            teamsToDisplay.push({
              id: oldTeamId,
              name: oldTeamName || 'Swapped Team',
              type: oldTeamType || 'pro',
              logo_url: '',
              points: pointsAtSwap,
              isSwappedOut: true,
              isSwappedIn: false,
              hasScore: false,
              upcoming_match_count: 0, // Swapped out teams don't need upcoming matches
            });
          }
          
          return teamsToDisplay.map((team) => (
            <TeamCard
              key={team.id}
              team={{
                id: team.id,
                name: team.name,
                type: team.type,
                logo_url: team.logo_url,
                upcoming_match_count: team.upcoming_match_count
              }}
              isSelected={true}
              onClick={() => {}}
              showStarToggle={!team.isSwappedOut}
              isStarred={starTeamId === team.id}
              onToggleStar={() => handleStarToggle(team.id)}
              disabledReason={!canChange ? 'Star change used' : null}
              variant="progress"
              fantasyPoints={team.points}
              onShowPerformance={handleShowPerformance}
              showSwapButton={canSwap && !swapUsed && !team.isSwappedOut}
              onSwapTeam={() => handleSwapTeam(team.id, team.name, team.type)}
              isSwappedIn={team.isSwappedIn}
              isSwappedOut={team.isSwappedOut}
            />
          ));
        })()}
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

      {/* Team Swap Selection Sheet */}
      {showSwapSheet && (
        <MultiTeamSelectionSheet
          isOpen={showSwapSheet}
          onClose={() => {
            setShowSwapSheet(false);
          }}
          proTeams={proTeams}
          amateurTeams={amateurTeams}
          selectedTeams={[]}
          onTeamsUpdate={handleTeamSelection}
          budgetRemaining={swappingTeam?.price || 0}
          totalBudget={50}
          round={{
            id: round.id,
            type: round.type,
            start_date: round.start_date,
            end_date: round.end_date,
            status: 'active',
            is_private: round.is_private,
            game_type: round.game_type,
            team_type: round.team_type
          }}
          swapMode={true}
          swappingTeamBudget={swappingTeam?.price}
        />
      )}

      {/* Team Swap Confirm Modal */}
      {showSwapConfirmModal && swappingTeam && selectedNewTeam && (
        <TeamSwapConfirmModal
          isOpen={showSwapConfirmModal}
          onClose={() => {
            setShowSwapConfirmModal(false);
            setSelectedNewTeam(null);
          }}
          onConfirm={handleConfirmSwap}
          oldTeam={{
            id: swappingTeam.id,
            name: swappingTeam.name,
            type: swappingTeam.type,
            currentPoints: swappingTeam.currentPoints
          }}
          newTeam={{
            id: selectedNewTeam.id,
            name: selectedNewTeam.name,
            type: selectedNewTeam.type,
            price: selectedNewTeam.price
          }}
        />
      )}
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
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [shareData, setShareData] = useState<{ publicUrl: string; blob: Blob } | null>(null);
  const isMobile = useMobile();

  const handleShare = async () => {
    if (!userId) return;
    setIsGenerating(true);
    
    const roundName = `${roundType.charAt(0).toUpperCase() + roundType.slice(1)} Round`;
    
    try {
      // Generate share card FIRST to get the direct image URL
      const result = await renderShareCard(roundId, userId);
      setShareData(result);
      
      const shareUrl = result.publicUrl;
      const text = `My ${roundName} picks - Check out my live progress!`;
      
      // Track missions
      try {
        const { MissionBus } = await import('@/lib/missionBus');
        MissionBus.onShareLineup(roundId);
        MissionBus.onShareThisWeek();
      } catch (e) {
        console.warn('Mission share tracking failed', e);
      }
      
      // Try native Web Share API with direct image URL
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'My Fantasy Picks',
            text: text,
            url: shareUrl
          });
          
          toast.success('Shared!');
          setIsGenerating(false);
          return;
        } catch (shareError) {
          if ((shareError as Error).name === 'AbortError') {
            setIsGenerating(false);
            return;
          }
          // Fall through to show custom share sheet
        }
      }
      
      // Show custom share sheet
      setShowShareSheet(true);
    } catch (err: any) {
      console.error('Share card generation failed:', err);
      toast.error(`Failed to generate share card: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
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

      <ShareSheet
        isOpen={showShareSheet}
        onOpenChange={setShowShareSheet}
        shareData={shareData}
        roundName={`${roundType.charAt(0).toUpperCase() + roundType.slice(1)} Round`}
        roundId={roundId}
        isMobile={isMobile}
      />
    </>
  );
};
