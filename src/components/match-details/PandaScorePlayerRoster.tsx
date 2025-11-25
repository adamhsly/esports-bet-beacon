import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
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
      nationality?: string;
      image_url?: string;
    }>;
    roster?: Array<{
      nickname: string;
      player_id: string;
      position?: string;
      role?: string;
      nationality?: string;
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

  // Check if we have any role/position data to show role column
  const shouldShowRoleColumn = (players: any[]) => {
    return players.some(player => {
      const role = player.role || player.position;
      return role && role.trim() !== '';
    });
  };
  const renderPlayerRow = (player: any, index: number, showRole: boolean) => {
    const playerName = player.nickname || 'Unknown Player';
    const playerCountry = player.nationality || 'Unknown';
    const playerImage = player.image_url || '/placeholder.svg';
    const code = (player.nationality || '').toLowerCase();
    const flagUrl = code ? `https://flagcdn.com/24x18/${code}.png` : null;
    return <TableRow key={`${player.player_id || index}`} className="cursor-pointer hover:bg-theme-gray-medium/20" onClick={() => handlePlayerClick(player.player_id)}>
        <TableCell>
          <div className="flex items-center gap-2">
            <img src={playerImage} alt={playerName} className="w-8 h-8 rounded-full object-cover" onError={e => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }} />
            <div>
              <div className="font-medium text-white">{playerName}</div>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {flagUrl && <img src={flagUrl} alt={`Flag of ${player.nationality}`} className="h-4 w-6 rounded-sm border border-theme-gray-light" loading="lazy" onError={e => {
            (e.target as HTMLImageElement).style.display = 'none';
          }} />}
            <span>{playerCountry}</span>
          </div>
        </TableCell>
        {showRole && <TableCell>
            {player.role || player.position ? <Badge variant="outline" className="text-xs text-white">
                {player.role || player.position}
              </Badge> : 'N/A'}
          </TableCell>}
      </TableRow>;
  };
  const renderNoDataMessage = (teamName: string, hasOtherTeamData: boolean) => <div className="text-center py-4 text-gray-400 bg-theme-gray-medium/20 rounded-lg">
      <AlertCircle className="h-5 w-5 mx-auto mb-2 text-gray-500" />
      <p>No player data available for {teamName}</p>
      {hasOtherTeamData && <p className="text-xs text-gray-500 mt-1">Player data may not be available for all teams</p>}
    </div>;
  const renderDataStatus = (teamName: string, playerCount: number) => null;
  const hasTeam1Data = (team1Players?.length || 0) > 0;
  const hasTeam2Data = (team2Players?.length || 0) > 0;
  const hasAnyData = hasTeam1Data || hasTeam2Data;

  // Check if we should show role columns for each team
  const showTeam1Role = shouldShowRoleColumn(team1Players);
  const showTeam2Role = shouldShowRoleColumn(team2Players);
  return <Card className="bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] border border-white/5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_12px_rgba(73,168,255,0.3)] transition-all duration-[250ms] ease-in-out hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_15px_rgba(73,168,255,0.4)] overflow-hidden mb-8">
      <div className="p-4 border-b border-theme-gray-medium">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center">
            <Users className="h-5 w-5 mr-2 text-theme-purple" />
            Team Rosters
          </h2>
        </div>
      </div>
      
      <div className="p-4">
        {/* Team 1 Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <img src={team1.logo || '/placeholder.svg'} alt={team1.name} className="w-6 h-6 object-contain rounded" onError={e => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }} />
              <h3 className="text-md font-medium text-white">{team1.name}</h3>
            </div>
            {renderDataStatus(team1.name, team1Players?.length || 0)}
          </div>
          {hasTeam1Data ? <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-400">Player</TableHead>
                  <TableHead className="text-gray-400">Country</TableHead>
                  {showTeam1Role && <TableHead className="text-gray-400">Role</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {team1Players.map((player, index) => renderPlayerRow(player, index, showTeam1Role))}
              </TableBody>
            </Table> : renderNoDataMessage(team1.name, hasTeam2Data)}
        </div>
        
        {/* Team 2 Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <img src={team2.logo || '/placeholder.svg'} alt={team2.name} className="w-6 h-6 object-contain rounded" onError={e => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }} />
              <h3 className="text-md font-medium text-white">{team2.name}</h3>
            </div>
            {renderDataStatus(team2.name, team2Players?.length || 0)}
          </div>
          {hasTeam2Data ? <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-400">Player</TableHead>
                  <TableHead className="text-gray-400">Country</TableHead>
                  {showTeam2Role && <TableHead className="text-gray-400">Role</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {team2Players.map((player, index) => renderPlayerRow(player, index, showTeam2Role))}
              </TableBody>
            </Table> : renderNoDataMessage(team2.name, hasTeam1Data)}
        </div>
        
        {/* Show loading message only if no data at all */}
        {!hasAnyData}
      </div>
      
      <PlayerDetailsModal isOpen={isPlayerModalOpen} onClose={() => setIsPlayerModalOpen(false)} playerId={selectedPlayerId} esportType={esportType} />
    </Card>;
};