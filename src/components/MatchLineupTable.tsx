
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { format } from 'date-fns';

interface Player {
  name: string;
  position: string;
  hash_image: string;
  short_name: string;
  country_name: string;
  date_of_birth: string;
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
  const renderPlayerRow = (player: Player) => (
    <TableRow key={player.name}>
      <TableCell>
        <div className="flex items-center gap-2">
          <img 
            src={player.hash_image ? `https://images.sportdevs.com/${player.hash_image}.png` : '/placeholder.svg'} 
            alt={player.name} 
            className="w-8 h-8 rounded-full"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
          <div>
            <div className="font-medium">{player.name}</div>
            <div className="text-sm text-gray-500">{player.short_name}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>{player.position}</TableCell>
      <TableCell>{player.country_name}</TableCell>
      <TableCell>
        {player.date_of_birth ? format(new Date(player.date_of_birth), 'MMM d, yyyy') : 'N/A'}
      </TableCell>
    </TableRow>
  );

  return (
    <Card className="bg-theme-gray-dark border border-theme-gray-medium overflow-hidden mb-8">
      <div className="p-4 border-b border-theme-gray-medium">
        <h2 className="text-lg font-bold text-white flex items-center">
          <Users className="h-5 w-5 mr-2 text-theme-purple" />
          Team Lineups
        </h2>
      </div>
      <div className="p-4">
        <div className="mb-6">
          <h3 className="text-md font-medium mb-3">{homeTeamName}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Date of Birth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {homeTeamPlayers.map(renderPlayerRow)}
            </TableBody>
          </Table>
        </div>
        
        <div>
          <h3 className="text-md font-medium mb-3">{awayTeamName}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Date of Birth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {awayTeamPlayers.map(renderPlayerRow)}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
};

export default MatchLineupTable;
