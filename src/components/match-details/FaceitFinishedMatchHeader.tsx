
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Trophy, Calendar, Crown } from 'lucide-react';

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
    finished_at?: string;
    competition_name?: string;
    tournament?: string;
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
  const finishedTime = match.finishedTime || match.finished_at;

  const getMatchDuration = () => {
    if (!finishedTime) return 'Unknown duration';
    
    const startTime = new Date(match.startTime);
    const endTime = new Date(finishedTime);
    const diffMs = endTime.getTime() - startTime.getTime();
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
    if (!results) return 'border-theme-gray-medium';
    return isWinner(teamIndex) ? 'border-green-400 bg-green-900/30' : 'border-gray-600 opacity-75';
  };

  const getScore = (teamIndex: number) => {
    if (!results) return '-';
    return teamIndex === 0 ? results.score.faction1 : results.score.faction2;
  };

  return (
    <Card className="bg-gradient-to-r from-green-900/20 via-emerald-900/20 to-green-900/20 border border-green-500/30 overflow-hidden">
      <div className="p-6">
        {/* Top Section - Tournament and Status */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {match.competition_name || match.tournament || 'FACEIT Match'}
            </h1>
            <div className="flex items-center gap-4 text-gray-400">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Finished {finishedTime ? new Date(finishedTime).toLocaleDateString() : new Date(match.startTime).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>Duration: {getMatchDuration()}</span>
              </div>
              {match.faceitData?.region && (
                <div className="flex items-center">
                  <span>Region: {match.faceitData.region}</span>
                </div>
              )}
            </div>
          </div>
          <Badge className="bg-green-500 text-white text-lg px-4 py-2">
            <CheckCircle className="h-4 w-4 mr-2" />
            FINISHED
          </Badge>
        </div>

        {/* Teams and Score Display */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
          {/* Team 1 */}
          <div className={`col-span-2 text-center rounded-lg p-6 border-2 transition-all ${getTeamStyling(0)}`}>
            <div className="flex flex-col items-center">
              <img 
                src={team1.logo || team1.avatar || '/placeholder.svg'} 
                alt={team1.name} 
                className="w-20 h-20 object-contain mb-3 rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              <h3 className="text-xl font-bold text-white mb-2">{team1.name}</h3>
              <p className="text-sm text-gray-400 mb-3">
                {team1.roster?.length || 0} players
              </p>
              {isWinner(0) && (
                <Badge className="bg-green-500/20 text-green-400 border-green-400/30">
                  <Crown className="h-3 w-3 mr-1" />
                  WINNER
                </Badge>
              )}
            </div>
          </div>
          
          {/* Score Section */}
          <div className="col-span-1 text-center">
            <div className="bg-theme-gray-dark rounded-lg p-6 border border-theme-gray-medium">
              {results ? (
                <>
                  <div className="text-5xl font-bold text-white mb-2">
                    <span className={isWinner(0) ? 'text-green-400' : 'text-gray-300'}>
                      {getScore(0)}
                    </span>
                    <span className="text-gray-500 mx-2">:</span>
                    <span className={isWinner(1) ? 'text-green-400' : 'text-gray-300'}>
                      {getScore(1)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">Final Score</div>
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-white mb-2">
                    <Trophy className="h-8 w-8 mx-auto mb-2" />
                  </div>
                  <div className="text-sm text-gray-400">Match Complete</div>
                  <div className="text-xs text-gray-500">Score unavailable</div>
                </>
              )}
            </div>
          </div>
          
          {/* Team 2 */}
          <div className={`col-span-2 text-center rounded-lg p-6 border-2 transition-all ${getTeamStyling(1)}`}>
            <div className="flex flex-col items-center">
              <img 
                src={team2.logo || team2.avatar || '/placeholder.svg'} 
                alt={team2.name} 
                className="w-20 h-20 object-contain mb-3 rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              <h3 className="text-xl font-bold text-white mb-2">{team2.name}</h3>
              <p className="text-sm text-gray-400 mb-3">
                {team2.roster?.length || 0} players
              </p>
              {isWinner(1) && (
                <Badge className="bg-green-500/20 text-green-400 border-green-400/30">
                  <Crown className="h-3 w-3 mr-1" />
                  WINNER
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Match Details Footer */}
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
                {finishedTime ? new Date(finishedTime).toLocaleTimeString([], { 
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
