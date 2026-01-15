import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Trophy, Users, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { getPandaScoreLiveScore } from '@/utils/pandascoreScoreUtils';
import { getFaceitScore } from '@/utils/faceitScoreUtils';

interface TeamMatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: {
    id: string;
    name: string;
    type: 'pro' | 'amateur';
  } | null;
  roundStartDate: string;
  roundEndDate: string;
}

interface Match {
  id: string;
  opponent: string;
  opponentLogo?: string;
  startTime: string;
  tournamentName?: string;
  status: string;
  score?: string;
  result?: 'win' | 'loss' | 'draw';
}

export const TeamMatchesModal: React.FC<TeamMatchesModalProps> = ({
  isOpen,
  onClose,
  team,
  roundStartDate,
  roundEndDate
}) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !team) {
      setMatches([]);
      return;
    }

    const fetchMatches = async () => {
      setLoading(true);
      try {
        // Convert round dates to date-only format (YYYY-MM-DD) to match how match_volume is calculated
        const startDateOnly = roundStartDate.split('T')[0];
        const endDateOnly = roundEndDate.split('T')[0];

        if (team.type === 'pro') {
          // Fetch from pandascore_matches - include raw_data for score extraction
          const { data, error } = await supabase
            .from('pandascore_matches')
            .select('id, teams, start_time, tournament_name, status, match_date, winner_id, raw_data')
            .gte('match_date', startDateOnly)
            .lte('match_date', endDateOnly)
            .not('teams', 'is', null)
            .not('status', 'eq', 'canceled');

          if (error) throw error;

          // Filter matches where this team participates
          const teamMatches: Match[] = [];
          for (const match of data || []) {
            const teams = match.teams as any[];
            if (!teams || teams.length < 2) continue;

            const team1 = teams[0]?.opponent;
            const team2 = teams[1]?.opponent;
            const team1Id = String(team1?.id || '');
            const team2Id = String(team2?.id || '');

            // Check if this team is in the match by ID
            const isTeam1 = team1Id === team.id;
            const isTeam2 = team2Id === team.id;

            if (isTeam1 || isTeam2) {
              const opponent = isTeam1 ? team2 : team1;
              
              // Determine result and score for finished matches
              let result: 'win' | 'loss' | 'draw' | undefined;
              let score: string | undefined;
              
              if (match.status === 'finished') {
                // Use the utility function to extract scores from raw_data
                const rawData = match.raw_data as any;
                const liveScore = getPandaScoreLiveScore(rawData, [
                  { id: team1?.id },
                  { id: team2?.id }
                ]);
                
                const ourScore = isTeam1 ? liveScore.a : liveScore.b;
                const theirScore = isTeam1 ? liveScore.b : liveScore.a;
                
                score = `${ourScore} - ${theirScore}`;
                
                // Determine winner
                if (match.winner_id) {
                  const winnerId = String(match.winner_id);
                  result = winnerId === team.id ? 'win' : 'loss';
                } else if (ourScore > theirScore) {
                  result = 'win';
                } else if (ourScore < theirScore) {
                  result = 'loss';
                } else {
                  result = 'draw';
                }
              }
              
              teamMatches.push({
                id: match.id,
                opponent: opponent?.name || 'TBD',
                opponentLogo: opponent?.image_url,
                startTime: match.start_time,
                tournamentName: match.tournament_name,
                status: match.status || 'scheduled',
                score,
                result
              });
            }
          }
          // Sort by start time
          teamMatches.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
          setMatches(teamMatches);

        } else {
          // Fetch from faceit_matches for amateur teams - include raw_data and faceit_data for score extraction
          const { data, error } = await supabase
            .from('faceit_matches')
            .select('id, match_id, faction1_name, faction2_name, faction1_id, faction2_id, scheduled_at, match_date, competition_name, status, raw_data, faceit_data, live_team_scores')
            .gte('match_date', startDateOnly)
            .lte('match_date', endDateOnly);

          if (error) throw error;

          // Filter matches where this team participates
          const teamMatches: Match[] = [];
          for (const match of data || []) {
            const faction1 = match.faction1_name || '';
            const faction2 = match.faction2_name || '';
            const faction1Id = match.faction1_id || '';
            const faction2Id = match.faction2_id || '';

            // Skip BYE matches
            if (faction1.toLowerCase() === 'bye' || faction2.toLowerCase() === 'bye') continue;

            // Match by team ID first, then fallback to name matching
            const isTeam1 = faction1Id === team.id || faction1.toLowerCase() === team.name.toLowerCase();
            const isTeam2 = faction2Id === team.id || faction2.toLowerCase() === team.name.toLowerCase();

            if (isTeam1 || isTeam2) {
              const opponent = isTeam1 ? faction2 : faction1;
              
              // Extract scores using the utility function
              let result: 'win' | 'loss' | 'draw' | undefined;
              let score: string | undefined;
              
              if (match.status === 'FINISHED' || match.status === 'finished') {
                const rawData = match.raw_data as any;
                const faceitData = match.faceit_data as any;
                const liveScores = match.live_team_scores as any;
                
                // Use the FACEIT score utility to properly extract scores
                const scoreResult = getFaceitScore(rawData, faceitData, liveScores);
                
                if (scoreResult.score) {
                  const ourScore = isTeam1 ? scoreResult.score.faction1 : scoreResult.score.faction2;
                  const theirScore = isTeam1 ? scoreResult.score.faction2 : scoreResult.score.faction1;
                  
                  score = `${ourScore} - ${theirScore}`;
                  
                  // Determine result based on winner or scores
                  if (scoreResult.winner) {
                    const weWon = (isTeam1 && scoreResult.winner === 'faction1') || 
                                  (isTeam2 && scoreResult.winner === 'faction2');
                    result = weWon ? 'win' : 'loss';
                  } else if (ourScore > theirScore) {
                    result = 'win';
                  } else if (ourScore < theirScore) {
                    result = 'loss';
                  } else {
                    result = 'draw';
                  }
                }
              }
              
              teamMatches.push({
                id: match.id,
                opponent: opponent || 'TBD',
                startTime: match.scheduled_at || match.match_date,
                tournamentName: match.competition_name,
                status: match.status || 'scheduled',
                score,
                result
              });
            }
          }

          // Sort by start time
          teamMatches.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
          setMatches(teamMatches);
        }
      } catch (err) {
        console.error('Error fetching team matches:', err);
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [isOpen, team, roundStartDate, roundEndDate]);

  const isAmateur = team?.type === 'amateur';

  const getResultBadge = (result: 'win' | 'loss' | 'draw') => {
    switch (result) {
      case 'win':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">WIN</Badge>;
      case 'loss':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">LOSS</Badge>;
      case 'draw':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">DRAW</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
      case 'live':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Live</Badge>;
      case 'finished':
        return <Badge variant="outline" className="text-gray-400">Finished</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-red-400 border-red-500/30">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="text-blue-400 border-blue-500/30">Upcoming</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-gray-700/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAmateur ? (
              <Users className="w-5 h-5 text-orange-400" />
            ) : (
              <Trophy className="w-5 h-5 text-blue-400" />
            )}
            <span className="text-white">{team?.name}</span>
            <Badge className={isAmateur ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}>
              {matches.length} {matches.length === 1 ? 'match' : 'matches'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto">
          {loading ? (
            <>
              <Skeleton className="h-16 w-full bg-gray-800/50" />
              <Skeleton className="h-16 w-full bg-gray-800/50" />
              <Skeleton className="h-16 w-full bg-gray-800/50" />
            </>
          ) : matches.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No scheduled matches in this round</p>
            </div>
          ) : (
            matches.map((match) => (
              <div
                key={match.id}
                className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {match.opponentLogo ? (
                      <img
                        src={match.opponentLogo}
                        alt={match.opponent}
                        className="w-8 h-8 object-contain"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center">
                        <Users className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <div className="text-white font-medium">vs {match.opponent}</div>
                      {match.tournamentName && (
                        <div className="text-xs text-gray-400 truncate max-w-[180px]">
                          {match.tournamentName}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {match.result ? getResultBadge(match.result) : getStatusBadge(match.status)}
                  </div>
                </div>
                
                {/* Score display for finished matches */}
                {match.score && (
                  <div className="mt-2 text-center">
                    <span className="text-lg font-bold text-white">{match.score}</span>
                  </div>
                )}

                <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {format(parseISO(match.startTime), 'MMM d, yyyy • HH:mm')}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
