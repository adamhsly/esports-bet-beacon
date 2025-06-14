
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Users } from 'lucide-react';

interface PandaScoreMobilePlayerLineupProps {
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

export const PandaScoreMobilePlayerLineup: React.FC<PandaScoreMobilePlayerLineupProps> = ({ teams }) => {
  const team1 = teams[0] || { name: 'Team 1', players: [] };
  const team2 = teams[1] || { name: 'Team 2', players: [] };

  const TeamSection = ({ team }: { team: any }) => (
    <Card className="bg-theme-gray-dark border-theme-gray-medium">
      <div className="p-3">
        <div className="flex items-center space-x-2 mb-3">
          <img 
            src={team.logo || '/placeholder.svg'} 
            alt={team.name} 
            className="w-6 h-6 object-contain rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
          <h4 className="text-sm font-semibold text-white truncate">{team.name}</h4>
          <Users className="h-4 w-4 text-gray-400" />
        </div>
        
        <div className="space-y-2">
          {team.players && team.players.length > 0 ? (
            team.players.slice(0, 3).map((player: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <User className="h-3 w-3 text-gray-400" />
                  <span className="text-white truncate">{player.nickname}</span>
                </div>
                {player.position && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    {player.position.slice(0, 3)}
                  </Badge>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-xs">No player data</p>
          )}
          
          {team.players && team.players.length > 3 && (
            <p className="text-gray-400 text-xs">+{team.players.length - 3} more</p>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-2">
      <TeamSection team={team1} />
      <TeamSection team={team2} />
    </div>
  );
};
