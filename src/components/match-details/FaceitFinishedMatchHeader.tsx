
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Trophy, Calendar } from 'lucide-react';

interface FaceitFinishedMatchHeaderProps {
  match: {
    id: string;
    teams: Array<{
      name: string;
      logo?: string;
      avatar?: string;
      roster?: Array<{
        nickname: string;
        player_id: string;
        skill_level?: number;
      }>;
    }>;
    startTime: string;
    finishedTime?: string;
    competition_name?: string;
    faceitData?: {
      region?: string;
      competitionType?: string;
      calculateElo?: boolean;
      results?: {
        winner: string;
        score: {
          faction1: number;
          faction2: number;
        };
      };
    };
    status: string;
  };
}

export const FaceitFinishedMatchHeader: React.FC<FaceitFinishedMatchHeaderProps> = ({ match }) => {
  const team1 = match.teams[0] || { name: 'Team 1' };
  const team2 = match.teams[1] || { name: 'Team 2' };
  const results = match.faceitData?.results;

  const getMatchDuration = () => {
    if (!match.finishedTime) return 'Unknown duration';
    
    const startTime = new Date(match.startTime);
    const finishedTime = new Date(match.finishedTime);
    const diffMs = finishedTime.getTime() - startTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const isWinner = (teamIndex: number) => {
    if (!results) return false;
    return results.winner === (teamIndex === 0 ? 'faction1' : 'faction2');
  };

  const getTeamStyling = (teamIndex: number) => {
    if (!results) return '';
    return isWinner(teamIndex) ? 'ring-2 ring-green-400/50 bg-green-900/20' : 'opacity-75';
  };

  return (
    <Card className="bg-gradient-to-r from-green-900/20 via-emerald-900/20 to-green-900/20 border border-green-500/30 overflow-hidden">
      <div className="p-6">
        {/* Match Title and Status */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {team1.name} vs {team2.name}
            </h1>
            <div className="flex items-center gap-4 text-gray-400">
              <div className="flex items-center">
                <Trophy className="h-4 w-4 mr-2" />
                <span>{match.competition_name || 'FACEIT Match'}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>Duration: {getMatchDuration()}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Finished {new Date(match.finishedTime || match.startTime).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <Badge className="bg-green-500 text-white text-lg px-4 py-2">
            <CheckCircle className="h-4 w-4 mr-2" />
            FINISHED
          </Badge>
        </div>

        {/* Teams Display with Result */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Team 1 */}
          <div className={`text-center rounded-lg p-4 transition-all ${getTeamStyling(0)}`}>
            <img 
              src={team1.logo || team1.avatar || '/placeholder.svg'} 
              alt={team1.name} 
              className="w-24 h-24 object-contain mx-auto mb-3 rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <h3 className="text-xl font-bold text-white mb-1">{team1.name}</h3>
            <p className="text-sm text-gray-400">
              {team1.roster?.length || 0} players
            </p>
            {isWinner(0) && (
              <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-400/30">
                <Trophy className="h-3 w-3 mr-1" />
                WINNER
              </Badge>
            )}
          </div>
          
          {/* Result Section */}
          <div className="text-center">
            <div className="bg-theme-gray-dark rounded-lg p-4 border border-theme-gray-medium">
              {results ? (
                <>
                  <div className="text-4xl font-bold text-white mb-2">
                    {results.score.faction1} : {results.score.faction2}
                  </div>
                  <div className="text-sm text-gray-400">Final Score</div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-white mb-2">Match Complete</div>
                  <div className="text-sm text-gray-400">Result unavailable</div>
                </>
              )}
              <div className="mt-2">
                <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-400/30">
                  Match Finished
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Team 2 */}
          <div className={`text-center rounded-lg p-4 transition-all ${getTeamStyling(1)}`}>
            <img 
              src={team2.logo || team2.avatar || '/placeholder.svg'} 
              alt={team2.name} 
              className="w-24 h-24 object-contain mx-auto mb-3 rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <h3 className="text-xl font-bold text-white mb-1">{team2.name}</h3>
            <p className="text-sm text-gray-400">
              {team2.roster?.length || 0} players
            </p>
            {isWinner(1) && (
              <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-400/30">
                <Trophy className="h-3 w-3 mr-1" />
                WINNER
              </Badge>
            )}
          </div>
        </div>

        {/* Match Details */}
        <div className="mt-6 pt-6 border-t border-theme-gray-medium">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-400">Region</div>
              <div className="text-white font-semibold">{match.faceitData?.region || 'EU'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Type</div>
              <div className="text-white font-semibold">
                {match.faceitData?.calculateElo ? 'ELO Match' : 'League Match'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Started</div>
              <div className="text-white font-semibold">
                {new Date(match.startTime).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Finished</div>
              <div className="text-white font-semibold">
                {match.finishedTime ? new Date(match.finishedTime).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }) : 'Unknown'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
