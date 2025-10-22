import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User } from 'lucide-react';
import { useMobile } from '@/hooks/useMobile';
import { FaceitPlayerDetailsModal } from './FaceitPlayerDetailsModal';
interface Player {
  nickname: string;
  player_id: string;
  game_skill_level?: number;
  avatar?: string;
}
interface Team {
  id?: string;
  name: string;
  logo?: string;
  avatar?: string;
  roster?: Player[];
}
interface FaceitPlayerLineupTableProps {
  teams: Team[];
}

// Helper function to get color for skill level
const getSkillLevelColor = (level?: number): string => {
  if (!level) return 'bg-gray-500/20 text-gray-400 border-gray-400/30';
  if (level >= 9) return 'bg-purple-500/20 text-purple-300 border-purple-400/30'; // Purple for 9-10
  if (level >= 7) return 'bg-orange-500/20 text-orange-300 border-orange-400/30'; // Orange for 7-8
  if (level >= 5) return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30'; // Yellow for 5-6
  if (level >= 3) return 'bg-green-500/20 text-green-300 border-green-400/30'; // Green for 3-4
  return 'bg-red-500/20 text-red-300 border-red-400/30'; // Red for 1-2
};
export const FaceitPlayerLineupTable: React.FC<FaceitPlayerLineupTableProps> = ({
  teams
}) => {
  const isMobile = useMobile();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeamName, setSelectedTeamName] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const team1 = teams[0] || {
    name: 'Team 1',
    roster: []
  };
  const team2 = teams[1] || {
    name: 'Team 2',
    roster: []
  };

  // If mobile, don't render this component (use mobile version instead)
  if (isMobile) {
    return null;
  }
  const handlePlayerClick = (player: Player, teamName: string) => {
    setSelectedPlayer(player);
    setSelectedTeamName(teamName);
    setIsModalOpen(true);
  };
  const renderTeamTable = (team: Team, teamIndex: number) => <div className={`p-4 rounded-lg ${teamIndex === 0 ? 'bg-blue-500/5' : 'bg-orange-500/5'}`}>
      <div className="flex items-center space-x-3 mb-6">
        <img src={team.logo || team.avatar || '/placeholder.svg'} alt={team.name} className="w-8 h-8 object-contain" onError={e => {
        (e.target as HTMLImageElement).src = '/placeholder.svg';
      }} />
        <h3 className="text-xl font-bold text-white">{team.name}</h3>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
            <TableHeader>
              <TableRow className="border-theme-gray-medium hover:bg-theme-gray-medium/30">
                <TableHead className="text-gray-300 font-semibold">Player</TableHead>
                <TableHead className="text-gray-300 font-semibold text-center">Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.roster?.map((player, idx) => <TableRow key={`${player.player_id}-${idx}`} className="border-theme-gray-medium hover:bg-theme-gray-medium/30 cursor-pointer" onClick={() => handlePlayerClick(player, team.name)}>
                  <TableCell className="py-3">
                    <div className="flex items-center space-x-3">
                      <img src={player.avatar || '/placeholder.svg'} alt={player.nickname} className="w-8 h-8 rounded-full object-cover" onError={e => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }} />
                      <span className="text-white font-medium text-sm">{player.nickname}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={getSkillLevelColor(player.game_skill_level)}>
                      {player.game_skill_level || '-'}
                    </Badge>
                  </TableCell>
                </TableRow>)}
          </TableBody>
        </Table>
      </div>
    </div>;
  return <>
      <Card className="bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] border border-white/5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_12px_rgba(73,168,255,0.3)] transition-all duration-[250ms] ease-in-out hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_15px_rgba(73,168,255,0.4)] overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <User className="h-6 w-6 mr-3" />
            Player Lineups
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderTeamTable(team1, 0)}
            {renderTeamTable(team2, 1)}
          </div>
        </div>
      </Card>

      <FaceitPlayerDetailsModal player={selectedPlayer} teamName={selectedTeamName} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>;
};