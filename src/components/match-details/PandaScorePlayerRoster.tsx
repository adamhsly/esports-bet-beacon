
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';

interface PandaScorePlayerRosterProps {
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

export const PandaScorePlayerRoster: React.FC<PandaScorePlayerRosterProps> = ({ teams }) => {
  const team1 = teams[0] || { name: 'Team 1', players: [] };
  const team2 = teams[1] || { name: 'Team 2', players: [] };

  const PlayerCard = ({ player, teamName }: { player: any; teamName: string }) => (
    <Card className="bg-theme-gray-medium/50 border border-theme-gray-light p-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-theme-gray-dark rounded-full flex items-center justify-center">
          <User className="h-5 w-5 text-gray-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-white font-semibold">{player.nickname}</h4>
          {player.position && (
            <Badge variant="outline" className="text-xs mt-1">
              {player.position}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
            <h3 className="text-xl font-bold text-white">{team1.name}</h3>
          </div>
          <div className="space-y-3">
            {team1.players && team1.players.length > 0 ? (
              team1.players.map((player, index) => (
                <PlayerCard key={index} player={player} teamName={team1.name} />
              ))
            ) : (
              <Card className="bg-theme-gray-medium/50 border border-theme-gray-light p-4">
                <p className="text-gray-400 text-center">No player data available</p>
              </Card>
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
            <h3 className="text-xl font-bold text-white">{team2.name}</h3>
          </div>
          <div className="space-y-3">
            {team2.players && team2.players.length > 0 ? (
              team2.players.map((player, index) => (
                <PlayerCard key={index} player={player} teamName={team2.name} />
              ))
            ) : (
              <Card className="bg-theme-gray-medium/50 border border-theme-gray-light p-4">
                <p className="text-gray-400 text-center">No player data available</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
