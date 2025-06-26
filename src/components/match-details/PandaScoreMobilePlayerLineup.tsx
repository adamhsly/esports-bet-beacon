
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Users, GamepadIcon } from 'lucide-react';

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
  esportType?: string;
}

export const PandaScoreMobilePlayerLineup: React.FC<PandaScoreMobilePlayerLineupProps> = ({ teams, esportType = 'csgo' }) => {
  const team1 = teams[0] || { name: 'Team 1', players: [] };
  const team2 = teams[1] || { name: 'Team 2', players: [] };

  // Game-specific position colors for mobile
  const getPositionColor = (position: string, game: string) => {
    const colorMaps = {
      'csgo': {
        'AWPer': 'bg-red-500/20 text-red-400',
        'IGL': 'bg-purple-500/20 text-purple-400',
        'Entry Fragger': 'bg-orange-500/20 text-orange-400',
        'Support': 'bg-blue-500/20 text-blue-400',
        'Lurker': 'bg-green-500/20 text-green-400',
        'Rifler': 'bg-gray-500/20 text-gray-400'
      },
      'lol': {
        'Top': 'bg-red-500/20 text-red-400',
        'Jungle': 'bg-green-500/20 text-green-400',
        'Mid': 'bg-yellow-500/20 text-yellow-400',
        'ADC': 'bg-blue-500/20 text-blue-400',
        'Support': 'bg-purple-500/20 text-purple-400'
      },
      'valorant': {
        'Duelist': 'bg-red-500/20 text-red-400',
        'Controller': 'bg-blue-500/20 text-blue-400',
        'Initiator': 'bg-yellow-500/20 text-yellow-400',
        'Sentinel': 'bg-green-500/20 text-green-400',
        'Flex': 'bg-purple-500/20 text-purple-400'
      },
      'dota2': {
        'Carry': 'bg-red-500/20 text-red-400',
        'Mid': 'bg-yellow-500/20 text-yellow-400',
        'Offlaner': 'bg-orange-500/20 text-orange-400',
        'Support': 'bg-blue-500/20 text-blue-400',
        'Hard Support': 'bg-purple-500/20 text-purple-400',
        'Core': 'bg-green-500/20 text-green-400'
      },
      'ow': {
        'Tank': 'bg-blue-500/20 text-blue-400',
        'DPS': 'bg-red-500/20 text-red-400',
        'Support': 'bg-green-500/20 text-green-400',
        'Flex': 'bg-purple-500/20 text-purple-400'
      }
    };
    
    const gameColors = colorMaps[game] || colorMaps['csgo'];
    return gameColors[position] || 'bg-gray-500/20 text-gray-400';
  };

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
          <GamepadIcon className="h-3 w-3 text-gray-400" />
          <Badge variant="outline" className="text-xs px-1 py-0">
            {esportType.toUpperCase()}
          </Badge>
          <Users className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-400">
            ({team.players?.length || 0})
          </span>
        </div>
        
        <div className="space-y-2">
          {team.players && team.players.length > 0 ? (
            team.players.slice(0, 5).map((player: any, index: number) => (
              <div key={`${player.player_id}-${index}`} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <User className="h-3 w-3 text-gray-400" />
                  <span className="text-white truncate">{player.nickname}</span>
                </div>
                {player.position && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-1 py-0 ${getPositionColor(player.position, esportType)}`}
                  >
                    {player.position.slice(0, 3)}
                  </Badge>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-2">
              <p className="text-gray-400 text-xs">No player data</p>
              <p className="text-gray-500 text-xs">{esportType.toUpperCase()} lineup TBD</p>
            </div>
          )}
          
          {team.players && team.players.length > 5 && (
            <p className="text-gray-400 text-xs text-center">+{team.players.length - 5} more</p>
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
