
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Radio, MapPin } from 'lucide-react';

interface PandaScoreLiveMatchHeaderProps {
  match: {
    id: string;
    teams: Array<{
      name: string;
      logo?: string;
      id?: string;
    }>;
    startTime: string;
    tournament?: string;
    esportType: string;
    bestOf?: number;
    status: string;
  };
}

export const PandaScoreLiveMatchHeader: React.FC<PandaScoreLiveMatchHeaderProps> = ({ match }) => {
  const team1 = match.teams[0] || { name: 'Team 1' };
  const team2 = match.teams[1] || { name: 'Team 2' };

  return (
    <Card className="bg-theme-gray-dark border-theme-gray-medium overflow-hidden border-l-4 border-l-red-500">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3 text-gray-400">
            <div className="flex items-center">
              <Trophy className="h-4 w-4 mr-2" />
              <span>{match.tournament || 'Professional Match'}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              <span className="uppercase">{match.esportType}</span>
            </div>
          </div>
          
          <Badge className="bg-red-500 text-white animate-pulse">
            <Radio className="h-3 w-3 mr-1" />
            LIVE
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-8 items-center">
          <div className="text-center">
            <img 
              src={team1.logo || '/placeholder.svg'} 
              alt={team1.name} 
              className="w-20 h-20 object-contain mx-auto mb-4 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <h3 className="text-xl font-bold text-white">{team1.name}</h3>
          </div>
          
          <div className="text-center">
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-400 mb-2">LIVE</div>
              <div className="text-sm text-gray-400">Best of {match.bestOf || 3}</div>
            </div>
          </div>
          
          <div className="text-center">
            <img 
              src={team2.logo || '/placeholder.svg'} 
              alt={team2.name} 
              className="w-20 h-20 object-contain mx-auto mb-4 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <h3 className="text-xl font-bold text-white">{team2.name}</h3>
          </div>
        </div>
      </div>
    </Card>
  );
};
