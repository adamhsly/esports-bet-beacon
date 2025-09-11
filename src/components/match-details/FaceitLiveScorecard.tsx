
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Radio, Target, Users, Clock } from 'lucide-react';

interface FaceitLiveScorecardProps {
  match: {
    id: string;
    teams: Array<{
      name: string;
      logo?: string;
      avatar?: string;
    }>;
    startTime: string;
    voting?: {
      map?: {
        pick?: string[];
      };
    };
    status: string;
  };
}

export const FaceitLiveScorecard: React.FC<FaceitLiveScorecardProps> = ({ match }) => {
  const team1 = match.teams[0] || { name: 'Team 1' };
  const team2 = match.teams[1] || { name: 'Team 2' };

  // Get current map from voting data
  const currentMap = match.voting?.map?.pick?.[0] || 'de_dust2';
  const mapName = currentMap.replace('de_', '').charAt(0).toUpperCase() + currentMap.replace('de_', '').slice(1);

  const getRoundStatus = () => {
    // In a real implementation, this would come from live match data
    // For now, we'll show a placeholder
    return {
      round: Math.floor(Math.random() * 30) + 1,
      side: Math.random() > 0.5 ? 'T' : 'CT',
      timeLeft: Math.floor(Math.random() * 115) + 5
    };
  };

  const roundStatus = getRoundStatus();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center">
        <Radio className="h-6 w-6 mr-3 text-red-400 animate-pulse" />
        Live Scorecard
      </h2>

      {/* Main Scorecard */}
      <Card className="bg-slate-700 border border-red-500/30 overflow-hidden">
        <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 p-1">
          <div className="bg-slate-700 p-6">
            {/* Map and Round Info */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-400/30">
                  <Target className="h-3 w-3 mr-1" />
                  {mapName}
                </Badge>
                <Badge className="bg-green-500/20 text-green-400 border-green-400/30">
                  Round {roundStatus.round}
                </Badge>
                <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-400/30">
                  <Clock className="h-3 w-3 mr-1" />
                  {Math.floor(roundStatus.timeLeft / 60)}:{(roundStatus.timeLeft % 60).toString().padStart(2, '0')}
                </Badge>
              </div>
              <Badge className="bg-red-500 text-white">
                <Radio className="h-3 w-3 mr-1 animate-pulse" />
                LIVE
              </Badge>
            </div>

            {/* Score Display */}
            <div className="grid grid-cols-5 gap-4 items-center">
              {/* Team 1 */}
              <div className="col-span-2">
                <div className="flex items-center space-x-3">
                  <img 
                    src={team1.logo || team1.avatar || '/placeholder.svg'} 
                    alt={team1.name} 
                    className="w-12 h-12 object-contain rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                  <div>
                    <h3 className="text-lg font-bold text-white">{team1.name}</h3>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {roundStatus.side === 'T' ? 'T-Side' : 'CT-Side'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Score */}
              <div className="text-center">
                <div className="bg-theme-gray-medium rounded-lg p-4">
                  <div className="text-3xl font-bold text-white mb-1">
                    {Math.floor(Math.random() * 16)} : {Math.floor(Math.random() * 16)}
                  </div>
                  <div className="text-xs text-gray-400">Current Score</div>
                </div>
              </div>

              {/* Team 2 */}
              <div className="col-span-2">
                <div className="flex items-center space-x-3 justify-end">
                  <div className="text-right">
                    <h3 className="text-lg font-bold text-white">{team2.name}</h3>
                    <div className="flex items-center space-x-2 justify-end">
                      <Badge variant="outline" className="text-xs">
                        {roundStatus.side === 'T' ? 'CT-Side' : 'T-Side'}
                      </Badge>
                    </div>
                  </div>
                  <img 
                    src={team2.logo || team2.avatar || '/placeholder.svg'} 
                    alt={team2.name} 
                    className="w-12 h-12 object-contain rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Match Progress */}
            <div className="mt-6 pt-4 border-t border-theme-gray-medium">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-400">Economy:</span>
                  <span className="text-green-400">$3,750 avg</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-gray-400">Players Alive:</span>
                  <span className="text-white">
                    <Users className="h-4 w-4 inline mr-1" />
                    4v3
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-gray-400">First to:</span>
                  <span className="text-white">16 rounds</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Round Timeline */}
      <Card className="bg-slate-700 border border-theme-gray-medium p-4">
        <h3 className="text-lg font-bold text-white mb-4">Round Timeline</h3>
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          {Array.from({ length: Math.min(roundStatus.round, 30) }, (_, i) => (
            <div 
              key={i}
              className={`flex-shrink-0 w-8 h-8 rounded text-xs font-bold flex items-center justify-center ${
                i === roundStatus.round - 1 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : Math.random() > 0.5 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
              }`}
            >
              {i + 1}
            </div>
          ))}
          {Array.from({ length: Math.max(0, 30 - roundStatus.round) }, (_, i) => (
            <div 
              key={`future-${i}`}
              className="flex-shrink-0 w-8 h-8 rounded text-xs font-bold flex items-center justify-center bg-theme-gray-medium text-gray-500"
            >
              {roundStatus.round + i + 1}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
