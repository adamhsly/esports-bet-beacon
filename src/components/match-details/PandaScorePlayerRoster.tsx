
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, AlertCircle, CheckCircle } from 'lucide-react';

interface PandaScorePlayerRosterProps {
  teams: Array<{
    name: string;
    logo?: string;
    id?: string;
    roster?: Array<{
      nickname: string;
      player_id: string;
      position?: string;
      role?: string;
    }>;
  }>;
}

export const PandaScorePlayerRoster: React.FC<PandaScorePlayerRosterProps> = ({ teams }) => {
  console.log('📋 PandaScore Player Roster received teams:', teams);
  
  const team1 = teams[0] || { name: 'Team 1', roster: [] };
  const team2 = teams[1] || { name: 'Team 2', roster: [] };

  const PlayerCard = ({ player, teamName }: { player: any; teamName: string }) => (
    <Card className="bg-theme-gray-medium/50 border border-theme-gray-light p-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-theme-gray-dark rounded-full flex items-center justify-center">
          <User className="h-5 w-5 text-gray-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-white font-semibold">{player.nickname || 'Unknown Player'}</h4>
          <div className="flex items-center gap-2 mt-1">
            {player.position && (
              <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-400 border-blue-400/30">
                {player.position}
              </Badge>
            )}
            {player.role && player.role !== player.position && (
              <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-400 border-purple-400/30">
                {player.role}
              </Badge>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">ID: {player.player_id}</div>
        </div>
      </div>
    </Card>
  );

  const RosterStatus = ({ teamName, playerCount }: { teamName: string; playerCount: number }) => (
    <div className="flex items-center gap-2 text-sm mb-2">
      {playerCount > 0 ? (
        <>
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-green-400">{playerCount} players loaded</span>
        </>
      ) : (
        <>
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <span className="text-yellow-400">No roster data available</span>
        </>
      )}
    </div>
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
          
          <RosterStatus teamName={team1.name} playerCount={team1.roster?.length || 0} />
          
          <div className="space-y-3">
            {team1.roster && team1.roster.length > 0 ? (
              team1.roster.map((player, index) => (
                <PlayerCard key={`${player.player_id || index}`} player={player} teamName={team1.name} />
              ))
            ) : (
              <Card className="bg-theme-gray-medium/50 border border-theme-gray-light p-4">
                <div className="text-center text-gray-400">
                  <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                  <p>No roster data available for {team1.name}</p>
                  <p className="text-xs mt-1">Tournament roster data may not be synced yet</p>
                </div>
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
          
          <RosterStatus teamName={team2.name} playerCount={team2.roster?.length || 0} />
          
          <div className="space-y-3">
            {team2.roster && team2.roster.length > 0 ? (
              team2.roster.map((player, index) => (
                <PlayerCard key={`${player.player_id || index}`} player={player} teamName={team2.name} />
              ))
            ) : (
              <Card className="bg-theme-gray-medium/50 border border-theme-gray-light p-4">
                <div className="text-center text-gray-400">
                  <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                  <p>No roster data available for {team2.name}</p>
                  <p className="text-xs mt-1">Tournament roster data may not be synced yet</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      {/* Debug info for development */}
      <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
        <div className="text-xs text-gray-400">
          <strong>🔧 Roster Debug Info:</strong><br />
          Team 1 ({team1.name}): {team1.roster?.length || 0} players<br />
          Team 2 ({team2.name}): {team2.roster?.length || 0} players<br />
          Data Source: Tournament Rosters API
        </div>
      </div>
    </div>
  );
};
