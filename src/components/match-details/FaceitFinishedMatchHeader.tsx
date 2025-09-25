
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Users, Calendar, Crown } from 'lucide-react';

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
    if (!results) return '';
    return isWinner(teamIndex) ? 'ring-2 ring-green-400/50 bg-green-900/20' : 'opacity-75';
  };

  const getScore = (teamIndex: number) => {
    if (!results) return '-';
    return teamIndex === 0 ? results.score.faction1 : results.score.faction2;
  };

  return (
    <Card className="bg-slate-700 ring-1 ring-orange-400/30 border-0 rounded-xl shadow-none">
      <div className="flex flex-col gap-2 px-3 py-3">
        {/* Tournament info row */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400 truncate max-w-[65%] font-medium">
            {match.competition_name || match.tournament || 'FACEIT Match'}
          </span>
          <div className="flex items-center gap-2 text-sm text-green-400 font-semibold">
            <CheckCircle size={14} />
            <span>FINISHED</span>
          </div>
        </div>
        
        {/* Center-aligned prominent score display */}
        {results && (
          <div className="flex justify-center items-center py-3">
            <div className="text-3xl font-bold text-green-400">
              {getScore(0)} - {getScore(1)}
            </div>
          </div>
        )}
        
        {/* Teams row */}
        <div className="flex items-center justify-between min-h-10">
          {/* Team 1 */}
          <div className={`flex items-center gap-2 flex-1 rounded-lg p-2 transition-all ${getTeamStyling(0)}`}>
            <img
              src={team1.logo || team1.avatar || '/placeholder.svg'}
              alt={`${team1.name} logo`}
              className="w-8 h-8 object-contain rounded-md bg-gray-800"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <span className="truncate font-semibold text-sm text-white max-w-[90px]">{team1.name}</span>
            {isWinner(0) && (
              <Crown className="h-4 w-4 text-green-400 ml-1" />
            )}
          </div>
          
          <span className="text-md font-bold text-gray-400 mx-2">vs</span>
          
          {/* Team 2 */}
          <div className={`flex items-center gap-2 flex-1 justify-end rounded-lg p-2 transition-all ${getTeamStyling(1)}`}>
            {isWinner(1) && (
              <Crown className="h-4 w-4 text-green-400 mr-1" />
            )}
            <span className="truncate font-semibold text-sm text-white max-w-[90px] text-right">{team2.name}</span>
            <img
              src={team2.logo || team2.avatar || '/placeholder.svg'}
              alt={`${team2.name} logo`}
              className="w-8 h-8 object-contain rounded-md bg-gray-800"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
          </div>
        </div>
        
        {/* Bottom info row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Badge
              variant="outline"
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-orange-500/20 text-orange-400 border-orange-400/30"
            >
              <Users size={10} className="mr-1" />
              FACEIT
            </Badge>
            <Badge
              variant="outline"
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-green-500/20 text-green-400 border-green-400/30 ml-1"
            >
              <CheckCircle size={10} className="mr-1" />
              FINISHED
            </Badge>
          </div>
          
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              <span>{finishedTime ? new Date(finishedTime).toLocaleDateString() : (match.startTime ? new Date(match.startTime).toLocaleDateString() : 'TBC')}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              <span>
                {finishedTime 
                  ? new Date(finishedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : match.startTime ? getMatchDuration() : 'TBC'
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
