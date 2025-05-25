
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Users } from 'lucide-react';

interface Player {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  country?: string;
  name?: string;
  position?: string;
  hash_image?: string;
  short_name?: string;
  country_name?: string;
  date_of_birth?: string;
}

interface MatchLineupTableProps {
  homeTeamPlayers: Player[];
  awayTeamPlayers: Player[];
  homeTeamName: string;
  awayTeamName: string;
}

const MatchLineupTable: React.FC<MatchLineupTableProps> = ({
  homeTeamPlayers,
  awayTeamPlayers,
  homeTeamName,
  awayTeamName
}) => {
  console.log('MatchLineupTable: Rendering with data:', {
    homeTeamPlayers: homeTeamPlayers?.length || 0,
    awayTeamPlayers: awayTeamPlayers?.length || 0,
    homeTeamName,
    awayTeamName
  });

  const renderPlayerRow = (player: Player, index: number) => {
    // Get player name from available fields
    const playerName = player.full_name || player.name || `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'Unknown Player';
    const playerCountry = player.country || player.country_name || 'Unknown';
    const playerImage = player.hash_image ? `https://images.sportdevs.com/${player.hash_image}.png` : '/placeholder.svg';
    
    return (
      <TableRow key={`${playerName}-${index}`}>
        <TableCell>
          <div className="flex items-center gap-2">
            <img 
              src={playerImage}
              alt={playerName} 
              className="w-8 h-8 rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <div>
              <div className="font-medium">{playerName}</div>
              {player.short_name && (
                <div className="text-sm text-gray-500">{player.short_name}</div>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>{player.position || 'N/A'}</TableCell>
        <TableCell>{playerCountry}</TableCell>
        <TableCell>
          {player.date_of_birth ? new Date(player.date_of_birth).toLocaleDateString() : 'N/A'}
        </TableCell>
      </TableRow>
    );
  };

  // Always render the component, even if no data
  return (
    <Card className="bg-theme-gray-dark border border-theme-gray-medium overflow-hidden mb-8">
      <div className="p-4 border-b border-theme-gray-medium">
        <h2 className="text-lg font-bold text-white flex items-center">
          <Users className="h-5 w-5 mr-2 text-theme-purple" />
          Team Lineups
        </h2>
      </div>
      <div className="p-4">
        {homeTeamPlayers?.length > 0 && (
          <div className="mb-6">
            <h3 className="text-md font-medium mb-3 text-white">{homeTeamName}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-400">Player</TableHead>
                  <TableHead className="text-gray-400">Position</TableHead>
                  <TableHead className="text-gray-400">Country</TableHead>
                  <TableHead className="text-gray-400">Date of Birth</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {homeTeamPlayers.map(renderPlayerRow)}
              </TableBody>
            </Table>
          </div>
        )}
        
        {awayTeamPlayers?.length > 0 && (
          <div>
            <h3 className="text-md font-medium mb-3 text-white">{awayTeamName}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-400">Player</TableHead>
                  <TableHead className="text-gray-400">Position</TableHead>
                  <TableHead className="text-gray-400">Country</TableHead>
                  <TableHead className="text-gray-400">Date of Birth</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {awayTeamPlayers.map(renderPlayerRow)}
              </TableBody>
            </Table>
          </div>
        )}
        
        {(!homeTeamPlayers?.length && !awayTeamPlayers?.length) && (
          <div className="text-center py-8 text-gray-400">
            <p>Loading player lineup information...</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default MatchLineupTable;
