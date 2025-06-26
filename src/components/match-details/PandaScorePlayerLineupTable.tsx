
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Users, GamepadIcon } from 'lucide-react';

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
  esportType?: string;
}

export const PandaScorePlayerLineupTable: React.FC<PandaScorePlayerLineupTableProps> = ({ teams, esportType = 'csgo' }) => {
  const team1 = teams[0] || { name: 'Team 1', players: [] };
  const team2 = teams[1] || { name: 'Team 2', players: [] };

  console.log('🎮 PandaScore Player Lineup - Enhanced data:', {
    esportType,
    team1: { name: team1.name, playerCount: team1.players?.length || 0, players: team1.players },
    team2: { name: team2.name, playerCount: team2.players?.length || 0, players: team2.players }
  });

  // Game-specific position colors
  const getPositionColor = (position: string, game: string) => {
    const colorMaps = {
      'csgo': {
        'AWPer': 'bg-red-500/20 text-red-400 border-red-400/30',
        'IGL': 'bg-purple-500/20 text-purple-400 border-purple-400/30',
        'Entry Fragger': 'bg-orange-500/20 text-orange-400 border-orange-400/30',
        'Support': 'bg-blue-500/20 text-blue-400 border-blue-400/30',
        'Lurker': 'bg-green-500/20 text-green-400 border-green-400/30',
        'Rifler': 'bg-gray-500/20 text-gray-400 border-gray-400/30'
      },
      'lol': {
        'Top': 'bg-red-500/20 text-red-400 border-red-400/30',
        'Jungle': 'bg-green-500/20 text-green-400 border-green-400/30',
        'Mid': 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30',
        'ADC': 'bg-blue-500/20 text-blue-400 border-blue-400/30',
        'Support': 'bg-purple-500/20 text-purple-400 border-purple-400/30'
      },
      'valorant': {
        'Duelist': 'bg-red-500/20 text-red-400 border-red-400/30',
        'Controller': 'bg-blue-500/20 text-blue-400 border-blue-400/30',
        'Initiator': 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30',
        'Sentinel': 'bg-green-500/20 text-green-400 border-green-400/30',
        'Flex': 'bg-purple-500/20 text-purple-400 border-purple-400/30'
      },
      'dota2': {
        'Carry': 'bg-red-500/20 text-red-400 border-red-400/30',
        'Mid': 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30',
        'Offlaner': 'bg-orange-500/20 text-orange-400 border-orange-400/30',
        'Support': 'bg-blue-500/20 text-blue-400 border-blue-400/30',
        'Hard Support': 'bg-purple-500/20 text-purple-400 border-purple-400/30',
        'Core': 'bg-green-500/20 text-green-400 border-green-400/30'
      },
      'ow': {
        'Tank': 'bg-blue-500/20 text-blue-400 border-blue-400/30',
        'DPS': 'bg-red-500/20 text-red-400 border-red-400/30',
        'Support': 'bg-green-500/20 text-green-400 border-green-400/30',
        'Flex': 'bg-purple-500/20 text-purple-400 border-purple-400/30'
      }
    };
    
    const gameColors = colorMaps[game] || colorMaps['csgo'];
    return gameColors[position] || 'bg-gray-500/20 text-gray-400 border-gray-400/30';
  };

  const TeamSection = ({ team, teamName }: { team: any; teamName: string }) => (
    <div>
      <div className="flex items-center space-x-3 mb-4">
        <img 
          src={team.logo || '/placeholder.svg'} 
          alt={team.name} 
          className="w-8 h-8 object-contain rounded"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }}
        />
        <h4 className="text-lg font-semibold text-white">{team.name}</h4>
        <GamepadIcon className="h-4 w-4 text-gray-400" />
        <Badge variant="outline" className="text-xs">
          {esportType.toUpperCase()}
        </Badge>
        <Users className="h-5 w-5 text-gray-400" />
        <span className="text-sm text-gray-400">
          ({team.players?.length || 0} players)
        </span>
      </div>
      
      <div className="space-y-2">
        {team.players && team.players.length > 0 ? (
          team.players.map((player: any, index: number) => (
            <div key={`${player.player_id}-${index}`} className="flex items-center justify-between p-3 bg-theme-gray-medium/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <User className="h-4 w-4 text-gray-400" />
                <div>
                  <span className="text-white font-medium">{player.nickname}</span>
                  {player.player_id && (
                    <p className="text-xs text-gray-500">ID: {player.player_id}</p>
                  )}
                </div>
              </div>
              {player.position && (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getPositionColor(player.position, esportType)}`}
                >
                  {player.position}
                </Badge>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-400 bg-theme-gray-medium/20 rounded-lg">
            <User className="h-6 w-6 mx-auto mb-2 text-gray-500" />
            <p>No player data available for {team.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {esportType.toUpperCase()} player lineup may not be finalized
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card className="bg-theme-gray-dark border-theme-gray-medium">
      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Team Lineups
          <Badge variant="outline" className="ml-2 text-xs">
            {esportType.toUpperCase()}
          </Badge>
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TeamSection team={team1} teamName="Team 1" />
          <TeamSection team={team2} teamName="Team 2" />
        </div>
        
        {/* Enhanced debug information */}
        <div className="mt-4 p-3 bg-gray-800/50 rounded text-xs text-gray-400">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Team Data:</strong>
              <div>Game: {esportType}</div>
              <div>Team1: {team1.players?.length || 0} players</div>
              <div>Team2: {team2.players?.length || 0} players</div>
            </div>
            <div>
              <strong>Player Positions:</strong>
              {team1.players?.map(p => p.position).filter(Boolean).join(', ') || 'None'} |{' '}
              {team2.players?.map(p => p.position).filter(Boolean).join(', ') || 'None'}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
