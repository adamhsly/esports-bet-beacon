import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Trophy, Users, Clock, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, addDays } from 'date-fns';
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
  isUpcoming?: boolean;
}

export const TeamMatchesModal: React.FC<TeamMatchesModalProps> = ({
  isOpen,
  onClose,
  team,
  roundStartDate,
  roundEndDate
}) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !team) {
      setMatches([]);
      setUpcomingMatches([]);
      return;
    }

    const fetchMatches = async () => {
      setLoading(true);
      try {
        // Use full timestamps for filtering to match edge function logic
        // This ensures consistent results with get-team-match-breakdown
        const startDateTime = roundStartDate;
        const endDateTime = roundEndDate;
        
        // For upcoming matches, look 14 days ahead from round end
        const upcomingEndDate = addDays(new Date(roundEndDate), 14).toISOString();

        if (team.type === 'pro') {
          // Fetch round matches and upcoming matches in parallel
          const [roundResult, upcomingResult] = await Promise.all([
            // Round matches
            supabase
              .from('pandascore_matches')
              .select('id, teams, start_time, tournament_name, status, match_date, winner_id, raw_data')
              .gte('start_time', startDateTime)
              .lte('start_time', endDateTime)
              .not('teams', 'is', null)
              .not('status', 'eq', 'canceled'),
            // Upcoming matches (after round ends)
            supabase
              .from('pandascore_matches')
              .select('id, teams, start_time, tournament_name, status, match_date')
              .gt('start_time', endDateTime)
              .lte('start_time', upcomingEndDate)
              .not('teams', 'is', null)
              .not('status', 'eq', 'canceled')
              .in('status', ['not_started', 'running'])
          ]);

          if (roundResult.error) throw roundResult.error;

          // Process round matches
          const teamMatches = processProMatches(roundResult.data || [], team, false);
          setMatches(teamMatches);
          
          // Process upcoming matches
          if (!upcomingResult.error) {
            const upcoming = processProMatches(upcomingResult.data || [], team, true);
            setUpcomingMatches(upcoming.slice(0, 5)); // Limit to 5 upcoming matches
          }

        } else {
          // Fetch from faceit_matches for amateur teams
          const { data, error } = await supabase
            .from('faceit_matches')
            .select('id, match_id, faction1_name, faction2_name, faction1_id, faction2_id, scheduled_at, started_at, match_date, competition_name, status, is_finished, raw_data, faceit_data, live_team_scores')
            .gte('started_at', startDateTime)
            .lte('started_at', endDateTime)
            .eq('is_finished', true);

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
                startTime: match.started_at || match.scheduled_at || match.match_date,
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
          setUpcomingMatches([]); // No upcoming for amateur teams currently
        }
      } catch (err) {
        console.error('Error fetching team matches:', err);
        setMatches([]);
        setUpcomingMatches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [isOpen, team, roundStartDate, roundEndDate]);

  // Helper function to process pro matches
  const processProMatches = (data: any[], team: { id: string; name: string }, isUpcoming: boolean): Match[] => {
    const teamMatches: Match[] = [];
    
    for (const match of data) {
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
        
        if (!isUpcoming && match.status === 'finished') {
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
          result,
          isUpcoming
        });
      }
    }
    
    // Sort by start time
    teamMatches.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    return teamMatches;
  };

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

  const renderMatchCard = (match: Match) => (
    <div
      key={match.id}
      className={`p-3 rounded-lg border transition-colors ${
        match.isUpcoming 
          ? 'bg-blue-900/20 border-blue-700/30 hover:border-blue-600/50' 
          : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600/50'
      }`}
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
  );

  const totalMatchCount = matches.length + upcomingMatches.length;

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
              {totalMatchCount} {totalMatchCount === 1 ? 'match' : 'matches'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4 max-h-[450px] overflow-y-auto">
          {loading ? (
            <>
              <Skeleton className="h-16 w-full bg-gray-800/50" />
              <Skeleton className="h-16 w-full bg-gray-800/50" />
              <Skeleton className="h-16 w-full bg-gray-800/50" />
            </>
          ) : (
            <>
              {/* Round matches section */}
              {matches.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Trophy className="w-4 h-4" />
                    <span>Round Matches ({matches.length})</span>
                  </div>
                  {matches.map(renderMatchCard)}
                </div>
              )}
              
              {/* Upcoming matches section */}
              {upcomingMatches.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-blue-400 pt-2 border-t border-gray-700/50">
                    <CalendarClock className="w-4 h-4" />
                    <span>Upcoming Matches ({upcomingMatches.length})</span>
                  </div>
                  {upcomingMatches.map(renderMatchCard)}
                </div>
              )}
              
              {/* Empty state */}
              {matches.length === 0 && upcomingMatches.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No scheduled matches found</p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};