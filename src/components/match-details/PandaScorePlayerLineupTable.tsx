
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';

interface PandaScorePlayerLineupTableProps {
  teams: Array<{
    name: string;
    logo?: string;
    id?: string;
    players?: Array<{
      nickname: string;
      player_id: string;
      position?: string;
    }>;
  }>;
}

export const PandaScorePlayerLineupTable: React.FC<PandaScorePlayerLineupTableProps> = ({ teams }) => {
  const team1 = teams[0] || { name: 'Team 1', players: [] };
  const team2 = teams[1] || { name: 'Team 2', players: [] };

  return (
    <Card className="bg-theme-gray-dark border-theme-gray-medium">
      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-6">Team Lineups</h3>
        
        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <img 
                src={team1.logo || '/placeholder.svg'} 
                alt={team1.name} 
                className="w-8 h-8 object-contain rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              <h4 className="text-lg font-semibold text-white">{team1.name}</h4>
            </div>
            
            <div className="space-y-2">
              {team1.players && team1.players.length > 0 ? (
                team1.players.map((player, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-theme-gray-medium/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-white">{player.nickname}</span>
                    </div>
                    {player.position && (
                      <Badge variant="outline" className="text-xs">
                        {player.position}
                      </Badge>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-4">No player data available</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-3 mb-4">
              <img 
                src={team2.logo || '/placeholder.svg'} 
                alt={team2.name} 
                className="w-8 h-8 object-contain rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              <h4 className="text-lg font-semibold text-white">{team2.name}</h4>
            </div>
            
            <div className="space-y-2">
              {team2.players && team2.players.length > 0 ? (
                team2.players.map((player, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-theme-gray-medium/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-white">{player.nickname}</span>
                    </div>
                    {player.position && (
                      <Badge variant="outline" className="text-xs">
                        {player.position}
                      </Badge>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-4">No player data available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
