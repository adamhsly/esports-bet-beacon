
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Users } from 'lucide-react';

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

  console.log('🎮 PandaScore Player Lineup - Team data:', {
    team1: { name: team1.name, playerCount: team1.players?.length || 0 },
    team2: { name: team2.name, playerCount: team2.players?.length || 0 }
  });

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
                <Badge variant="outline" className="text-xs">
                  {player.position}
                </Badge>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-400 bg-theme-gray-medium/20 rounded-lg">
            <User className="h-6 w-6 mx-auto mb-2 text-gray-500" />
            <p>No player data available for {team.name}</p>
            <p className="text-xs text-gray-500 mt-1">Player lineup may not be finalized</p>
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
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TeamSection team={team1} teamName="Team 1" />
          <TeamSection team={team2} teamName="Team 2" />
        </div>
        
        {/* Debug information for development */}
        <div className="mt-4 p-3 bg-gray-800/50 rounded text-xs text-gray-400">
          <strong>Debug:</strong> Team1 has {team1.players?.length || 0} players, Team2 has {team2.players?.length || 0} players
        </div>
      </div>
    </Card>
  );
};
