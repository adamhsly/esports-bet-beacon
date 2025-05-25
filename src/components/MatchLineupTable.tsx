
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Users, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

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
  console.log('🏟️ MatchLineupTable: Rendering with enhanced debugging:', {
    homeTeamPlayers: homeTeamPlayers?.length || 0,
    awayTeamPlayers: awayTeamPlayers?.length || 0,
    homeTeamName,
    awayTeamName,
    homePlayersData: homeTeamPlayers?.slice(0, 2), // Log first 2 players for debugging
    awayPlayersData: awayTeamPlayers?.slice(0, 2)
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

  const renderNoDataMessage = (teamName: string, hasOtherTeamData: boolean) => (
    <div className="text-center py-4 text-gray-400 bg-theme-gray-medium/20 rounded-lg">
      <AlertCircle className="h-5 w-5 mx-auto mb-2 text-gray-500" />
      <p>No player data available for {teamName}</p>
      {hasOtherTeamData && (
        <p className="text-xs text-gray-500 mt-1">Player data may not be available for all teams</p>
      )}
    </div>
  );

  const renderDataStatus = (teamName: string, playerCount: number) => (
    <div className="flex items-center gap-2 text-sm">
      {playerCount > 0 ? (
        <>
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-green-400">{playerCount} players loaded</span>
        </>
      ) : (
        <>
          <XCircle className="h-4 w-4 text-red-500" />
          <span className="text-red-400">No player data</span>
        </>
      )}
    </div>
  );

  const hasHomeData = (homeTeamPlayers?.length || 0) > 0;
  const hasAwayData = (awayTeamPlayers?.length || 0) > 0;
  const hasAnyData = hasHomeData || hasAwayData;

  return (
    <Card className="bg-theme-gray-dark border border-theme-gray-medium overflow-hidden mb-8">
      <div className="p-4 border-b border-theme-gray-medium">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center">
            <Users className="h-5 w-5 mr-2 text-theme-purple" />
            Team Lineups
          </h2>
          <div className="text-sm text-gray-400">
            Data available: {hasHomeData ? 1 : 0} + {hasAwayData ? 1 : 0} / 2 teams
          </div>
        </div>
      </div>
      <div className="p-4">
        {/* Home Team Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-medium text-white">{homeTeamName}</h3>
            {renderDataStatus(homeTeamName, homeTeamPlayers?.length || 0)}
          </div>
          {hasHomeData ? (
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
          ) : (
            renderNoDataMessage(homeTeamName, hasAwayData)
          )}
        </div>
        
        {/* Away Team Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-medium text-white">{awayTeamName}</h3>
            {renderDataStatus(awayTeamName, awayTeamPlayers?.length || 0)}
          </div>
          {hasAwayData ? (
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
          ) : (
            renderNoDataMessage(awayTeamName, hasHomeData)
          )}
        </div>
        
        {/* Show loading message only if no data at all */}
        {!hasAnyData && (
          <div className="text-center py-8 text-gray-400 bg-theme-gray-medium/10 rounded-lg">
            <AlertCircle className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
            <p className="font-medium">No player lineup information available</p>
            <p className="text-sm mt-1">Player data may not be available for this match</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default MatchLineupTable;
