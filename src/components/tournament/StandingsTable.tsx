
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface TeamStanding {
  id: string;
  position: number;
  team: {
    id: string;
    name: string;
    logo: string;
  };
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  score_for?: number;
  score_against?: number;
}

interface StandingsTableProps {
  standings: TeamStanding[];
  title: string;
}

export const StandingsTable: React.FC<StandingsTableProps> = ({ standings, title }) => {
  // Sort standings by position
  const sortedStandings = [...standings].sort((a, b) => a.position - b.position);

  return (
    <div className="w-full">
      <h3 className="text-xl font-medium mb-3">{title}</h3>
      <Table>
        <TableCaption>Current tournament standings</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Pos</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="text-center">MP</TableHead>
            <TableHead className="text-center">W</TableHead>
            <TableHead className="text-center">D</TableHead>
            <TableHead className="text-center">L</TableHead>
            <TableHead className="text-center">Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedStandings.map((standing) => (
            <TableRow 
              key={standing.id} 
              className={standing.position <= 4 ? "bg-theme-gray-medium/10" : ""}
            >
              <TableCell className="font-medium">{standing.position}</TableCell>
              <TableCell>
                <Link to={`/team/${standing.team.id}`} className="flex items-center hover:text-theme-purple">
                  <img 
                    src={standing.team.logo || '/placeholder.svg'} 
                    alt={standing.team.name} 
                    className="w-6 h-6 mr-2 object-contain"
                  />
                  <span>{standing.team.name}</span>
                </Link>
              </TableCell>
              <TableCell className="text-center">{standing.matches_played}</TableCell>
              <TableCell className="text-center">{standing.wins}</TableCell>
              <TableCell className="text-center">{standing.draws}</TableCell>
              <TableCell className="text-center">{standing.losses}</TableCell>
              <TableCell className="text-center font-medium">{standing.points}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default StandingsTable;
