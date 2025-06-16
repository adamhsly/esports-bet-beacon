
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Radio, Clock, Trophy } from 'lucide-react';

interface FaceitLiveMatchHeaderProps {
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
    competition_name?: string;
    faceitData?: {
      region?: string;
      competitionType?: string;
      calculateElo?: boolean;
    };
    status: string;
  };
}

export const FaceitLiveMatchHeader: React.FC<FaceitLiveMatchHeaderProps> = ({ match }) => {
  const team1 = match.teams[0] || { name: 'Team 1' };
  const team2 = match.teams[1] || { name: 'Team 2' };

  const getElapsedTime = () => {
    const startTime = new Date(match.startTime);
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Card className="bg-gradient-to-r from-red-900/20 via-orange-900/20 to-red-900/20 border border-red-500/30 overflow-hidden">
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
                <span>Live for {getElapsedTime()}</span>
              </div>
            </div>
          </div>
          <Badge className="bg-red-500 text-white text-lg px-4 py-2">
            <Radio className="h-4 w-4 mr-2 animate-pulse" />
            LIVE
          </Badge>
        </div>

        {/* Teams Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Team 1 */}
          <div className="text-center">
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
          </div>
          
          {/* VS Section */}
          <div className="text-center">
            <div className="bg-theme-gray-dark rounded-lg p-4 border border-theme-gray-medium">
              <div className="text-4xl font-bold text-white mb-2">0 : 0</div>
              <div className="text-sm text-gray-400">Current Score</div>
              <div className="mt-2">
                <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-400/30">
                  Map 1 - Live
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Team 2 */}
          <div className="text-center">
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
          </div>
        </div>
      </div>
    </Card>
  );
};
