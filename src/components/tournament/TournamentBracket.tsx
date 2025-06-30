
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MatchInfo } from '@/components/MatchCard';

interface TournamentBracketProps {
  matches: MatchInfo[];
  tournamentName: string;
}

interface BracketRound {
  roundName: string;
  matches: MatchInfo[];
}

export const TournamentBracket: React.FC<TournamentBracketProps> = ({ 
  matches, 
  tournamentName 
}) => {
  // Group matches into tournament rounds
  const groupMatchesIntoRounds = (): BracketRound[] => {
    // Sort matches by date
    const sortedMatches = [...matches].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const rounds: BracketRound[] = [];
    const totalMatches = sortedMatches.length;

    if (totalMatches === 0) return rounds;

    // Determine bracket structure based on number of matches
    if (totalMatches === 1) {
      rounds.push({ roundName: 'Final', matches: sortedMatches });
    } else if (totalMatches <= 3) {
      // Small tournament: Semifinals + Final
      const final = sortedMatches.slice(-1);
      const semifinals = sortedMatches.slice(0, -1);
      
      if (semifinals.length > 0) {
        rounds.push({ roundName: 'Semifinals', matches: semifinals });
      }
      rounds.push({ roundName: 'Final', matches: final });
    } else if (totalMatches <= 7) {
      // Medium tournament: Quarterfinals + Semifinals + Final
      const final = sortedMatches.slice(-1);
      const semifinals = sortedMatches.slice(-3, -1);
      const quarterfinals = sortedMatches.slice(0, -3);
      
      if (quarterfinals.length > 0) {
        rounds.push({ roundName: 'Quarterfinals', matches: quarterfinals });
      }
      if (semifinals.length > 0) {
        rounds.push({ roundName: 'Semifinals', matches: semifinals });
      }
      rounds.push({ roundName: 'Final', matches: final });
    } else {
      // Large tournament: Multiple rounds
      const final = sortedMatches.slice(-1);
      const semifinals = sortedMatches.slice(-3, -1);
      const quarterfinals = sortedMatches.slice(-7, -3);
      const earlierRounds = sortedMatches.slice(0, -7);
      
      if (earlierRounds.length > 0) {
        rounds.push({ roundName: 'First Rounds', matches: earlierRounds });
      }
      if (quarterfinals.length > 0) {
        rounds.push({ roundName: 'Quarterfinals', matches: quarterfinals });
      }
      if (semifinals.length > 0) {
        rounds.push({ roundName: 'Semifinals', matches: semifinals });
      }
      rounds.push({ roundName: 'Final', matches: final });
    }

    return rounds;
  };

  const rounds = groupMatchesIntoRounds();

  // Unified status logic that matches the main app
  const getMatchStatus = (match: MatchInfo) => {
    const now = new Date();
    const matchTime = new Date(match.startTime);
    
    if (match.source === 'professional') {
      // PandaScore status mapping
      const status = match.status?.toLowerCase() || '';
      if (['live', 'running', 'ongoing'].includes(status)) {
        return 'live';
      } else if (['finished', 'completed', 'cancelled', 'canceled', 'postponed', 'forfeit'].includes(status)) {
        return 'finished';
      } else if (['scheduled', 'upcoming', 'ready', 'not_started'].includes(status)) {
        return 'upcoming';
      }
    } else {
      // FACEIT status mapping
      const status = match.status?.toLowerCase() || '';
      if (['ongoing', 'running', 'live'].includes(status)) {
        return 'live';
      } else if (['finished', 'completed', 'cancelled', 'aborted'].includes(status)) {
        return 'finished';
      } else if (['upcoming', 'ready', 'scheduled', 'configured'].includes(status)) {
        return 'upcoming';
      }
    }
    
    // Fallback to time-based logic
    if (matchTime > now) {
      return 'upcoming';
    } else {
      return 'live';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-500/20 text-red-400 border-red-400/30';
      case 'finished': return 'bg-green-500/20 text-green-400 border-green-400/30';
      case 'upcoming': return 'bg-blue-500/20 text-blue-400 border-blue-400/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-400/30';
    }
  };

  if (matches.length === 0) {
    return (
      <div className="text-center py-10 bg-theme-gray-dark/50 rounded-md">
        <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-400">No matches found for this tournament.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold mb-4 text-center flex items-center justify-center gap-2">
        <Trophy className="h-5 w-5 text-theme-purple" />
        {tournamentName} - Tournament Bracket
      </h2>
      
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max p-2">
          {rounds.map((round, roundIndex) => (
            <div 
              key={`round-${roundIndex}`} 
              className="flex flex-col space-y-3"
              style={{ 
                minWidth: '240px',
                marginTop: roundIndex > 0 ? `${Math.pow(2, roundIndex) * 8}px` : '0'
              }}
            >
              <div className="text-center mb-2">
                <Badge variant="outline" className="px-3 py-1 text-xs font-semibold">
                  {round.roundName}
                </Badge>
              </div>
              
              {round.matches.map((match) => {
                const status = getMatchStatus(match);
                
                return (
                  <Link 
                    to={`/match/${match.id}`}
                    key={match.id} 
                    className="block transition-transform hover:scale-102"
                  >
                    <Card className={`border hover:border-theme-purple/50 ${
                      status === 'live' ? 'border-red-500/50' : 'border-theme-gray-medium'
                    }`}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-center mb-2">
                          <Badge className={`text-xs ${getStatusColor(status)}`}>
                            {status === 'live' ? '🔴 LIVE' : status.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            BO{match.bestOf || 3}
                          </span>
                        </div>

                        {match.teams.map((team, idx) => (
                          <div key={idx} className={`flex justify-between items-center py-1.5 ${
                            idx === 0 ? 'border-b border-theme-gray-medium/50' : ''
                          }`}>
                            <div className="flex items-center">
                              <img 
                                src={team.logo || '/placeholder.svg'} 
                                alt={team.name} 
                                className="w-5 h-5 mr-2 object-contain"
                              />
                              <span className="truncate max-w-[140px] text-sm font-medium">
                                {team.name}
                              </span>
                            </div>
                            <div className="text-sm font-bold">
                              {status === 'finished' ? Math.floor(Math.random() * 3) : '-'}
                            </div>
                          </div>
                        ))}

                        <div className="flex items-center justify-center text-xs text-gray-500 mt-2 pt-1.5 border-t border-theme-gray-medium/30">
                          <Calendar className="h-3 w-3 mr-1" />
                          {status === 'finished' 
                            ? "Completed" 
                            : new Date(match.startTime).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TournamentBracket;
