import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, AlertCircle, CheckCircle } from 'lucide-react';
import { PlayerDetailsModal } from '@/components/PlayerDetailsModal';
interface PandaScorePlayerRosterProps {
  teams: Array<{
    name: string;
    logo?: string;
    id?: string;
    players?: Array<{
      nickname: string;
      player_id: string;
      position?: string;
      role?: string;
      nationality?: string; // Added nationality here
      image_url?: string; // Added for the img src
    }>;
    roster?: Array<{
      nickname: string;
      player_id: string;
      position?: string;
      role?: string;
      nationality?: string; // Added nationality here
      image_url?: string;
    }>;
  }>;
  esportType?: string;
}
export const PandaScorePlayerRoster: React.FC<PandaScorePlayerRosterProps> = ({
  teams,
  esportType = 'csgo'
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const handlePlayerClick = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setIsPlayerModalOpen(true);
  };
  console.log('📋 PandaScore Player Roster received teams:', {
    esportType,
    teamsCount: teams?.length || 0,
    team1: teams[0] ? {
      name: teams[0].name,
      playersFromPlayers: teams[0].players?.length || 0,
      playersFromRoster: teams[0].roster?.length || 0
    } : null,
    team2: teams[1] ? {
      name: teams[1].name,
      playersFromPlayers: teams[1].players?.length || 0,
      playersFromRoster: teams[1].roster?.length || 0
    } : null
  });
  const team1 = teams[0] || {
    name: 'Team 1',
    players: [],
    roster: []
  };
  const team2 = teams[1] || {
    name: 'Team 2',
    players: [],
    roster: []
  };

  // Use players array first, fallback to roster array
  const team1Players = team1.players || team1.roster || [];
  const team2Players = team2.players || team2.roster || [];
  console.log('📋 Final player arrays:', {
    team1: {
      name: team1.name,
      playerCount: team1Players.length
    },
    team2: {
      name: team2.name,
      playerCount: team2Players.length
    }
  });

  // Game-specific position colors
  const getPositionColor = (position: string, game: string) => {
    const colorMaps = {
      'dota2': {
        'Carry': 'bg-red-500/20 text-red-400 border-red-400/30',
        'Mid': 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30',
        'Offlaner': 'bg-orange-500/20 text-orange-400 border-orange-400/30',
        'Support': 'bg-blue-500/20 text-blue-400 border-blue-400/30',
        'Hard Support': 'bg-purple-500/20 text-purple-400 border-purple-400/30',
        'Core': 'bg-green-500/20 text-green-400 border-green-400/30'
      },
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
  const PlayerCard = ({
    player,
    teamName
  }: {
    player: any;
    teamName: string;
  }) => {
    const code = (player.nationality || '').toLowerCase();
    const flagUrl = code ? `https://flagcdn.com/24x18/${code}.png` : null;
    return <Card className="bg-theme-gray-medium/60 border border-theme-gray-light p-5 rounded-lg hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-center gap-4">
        {/* Player image */}
        <img src={player.image_url || '/placeholder.svg'} alt={player.nickname} className="w-16 h-16 rounded-full object-cover border-2 border-theme-gray-light" onError={e => {
          (e.target as HTMLImageElement).src = '/placeholder.svg';
        }} />

        {/* Player info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <button onClick={() => handlePlayerClick(player.player_id)} className="truncate text-left text-white text-lg font-semibold hover:text-blue-400 transition-colors" title={`View details for ${player.nickname}`}>
              {player.nickname || 'Unknown Player'}
            </button>
            {flagUrl && <img src={flagUrl} alt={`Flag of ${player.nationality}`} className="h-4 w-6 rounded-sm border border-theme-gray-light" loading="lazy" onError={e => {
              (e.target as HTMLImageElement).style.display = 'none';
            }} />}
            {player.role && player.role.trim() !== '' && <Badge variant="outline" className="text-xs bg-accent/20 text-accent-foreground border-accent/40">
                {player.role}
              </Badge>}
          </div>

          

          
        </div>
      </div>
    </Card>;
  };
  const RosterStatus = ({
    teamName,
    playerCount
  }: {
    teamName: string;
    playerCount: number;
  }) => <div className="flex items-center gap-2 text-sm mb-2">
      {playerCount > 0 ? <>
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-green-400">{playerCount} players loaded</span>
        </> : <>
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <span className="text-yellow-400">No roster data available</span>
        </>}
    </div>;
  return <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <img src={team1.logo || '/placeholder.svg'} alt={team1.name} className="w-8 h-8 object-contain rounded" onError={e => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }} />
            <h3 className="text-xl font-bold text-white">{team1.name}</h3>
            <Badge variant="outline" className="text-xs">
              {esportType.toUpperCase()}
            </Badge>
          </div>
          
          <RosterStatus teamName={team1.name} playerCount={team1Players.length} />
          
          <div className="space-y-3">
            {team1Players.length > 0 ? team1Players.map((player, index) => <PlayerCard key={`${player.player_id || index}`} player={player} teamName={team1.name} />) : <Card className="bg-theme-gray-medium/50 border border-theme-gray-light p-4">
                <div className="text-center text-gray-400">
                  <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                  <p>No roster data available for {team1.name}</p>
                  <p className="text-xs mt-1">Tournament roster data may not be synced yet</p>
                </div>
              </Card>}
          </div>
        </div>

        <div>
          <div className="flex items-center space-x-3 mb-4">
            <img src={team2.logo || '/placeholder.svg'} alt={team2.name} className="w-8 h-8 object-contain rounded" onError={e => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }} />
            <h3 className="text-xl font-bold text-white">{team2.name}</h3>
            <Badge variant="outline" className="text-xs">
              {esportType.toUpperCase()}
            </Badge>
          </div>
          
          <RosterStatus teamName={team2.name} playerCount={team2Players.length} />
          
          <div className="space-y-3">
            {team2Players.length > 0 ? team2Players.map((player, index) => <PlayerCard key={`${player.player_id || index}`} player={player} teamName={team2.name} />) : <Card className="bg-theme-gray-medium/50 border border-theme-gray-light p-4">
                <div className="text-center text-gray-400">
                  <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                  <p>No roster data available for {team2.name}</p>
                  <p className="text-xs mt-1">Tournament roster data may not be synced yet</p>
                </div>
              </Card>}
          </div>
        </div>
      </div>
      
      <PlayerDetailsModal isOpen={isPlayerModalOpen} onClose={() => setIsPlayerModalOpen(false)} playerId={selectedPlayerId} esportType={esportType} />
    </div>;
};