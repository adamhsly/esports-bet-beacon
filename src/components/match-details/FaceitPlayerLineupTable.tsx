import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, Trophy, Target, TrendingUp } from 'lucide-react';
import { useMobile } from '@/hooks/useMobile';
import { PlayerDetailsModal } from './PlayerDetailsModal';

interface Player {
  nickname: string;
  player_id: string;
  skill_level?: number;
  avatar?: string;
  total_matches?: number;
  win_rate?: number;
  kd_ratio?: number;
  recent_form?: string;
  recent_form_string?: string;
  match_history?: Array<{
    id: string;
    match_id: string;
    match_date: string;
    map_name?: string;
    team_name?: string;
    opponent_team_name?: string;
    match_result: 'win' | 'loss';
    competition_name?: string;
    competition_type?: string;
    kills?: number;
    deaths?: number;
    assists?: number;
    kd_ratio?: number;
    headshots?: number;
    headshots_percent?: number;
    mvps?: number;
    adr?: number;
    faceit_elo_change?: number;
  }>;
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

export const FaceitPlayerLineupTable: React.FC<FaceitPlayerLineupTableProps> = ({ teams }) => {
  const isMobile = useMobile();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeamName, setSelectedTeamName] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const team1 = teams[0] || { name: 'Team 1', roster: [] };
  const team2 = teams[1] || { name: 'Team 2', roster: [] };

  // If mobile, don't render this component (use mobile version instead)
  if (isMobile) {
    return null;
  }

  const handlePlayerClick = (player: Player, teamName: string) => {
    setSelectedPlayer(player);
    setSelectedTeamName(teamName);
    setIsModalOpen(true);
  };

  const getFormBadge = (form?: string) => {
    if (!form) return null;
    const wins = (form.match(/W/g) || []).length;
    const total = form.length;
    const winRate = (wins / total) * 100;
    
    return (
      <Badge 
        variant="outline" 
        className={`text-xs ${
          winRate >= 60 ? 'text-green-400 border-green-400/30' : 
          winRate >= 40 ? 'text-yellow-400 border-yellow-400/30' : 
          'text-red-400 border-red-400/30'
        }`}
      >
        {form}
      </Badge>
    );
  };

  const hasEnhancedStats = (roster?: Player[]) => {
    return roster?.some(player => player.total_matches && player.total_matches > 0) || false;
  };

  const renderTeamTable = (team: Team, teamIndex: number) => (
    <div className={`p-4 rounded-lg ${teamIndex === 0 ? 'bg-blue-500/5' : 'bg-orange-500/5'}`}>
      <div className="flex items-center space-x-3 mb-6">
        <img 
          src={team.logo || team.avatar || '/placeholder.svg'} 
          alt={team.name} 
          className="w-8 h-8 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }}
        />
        <h3 className="text-xl font-bold text-white">{team.name}</h3>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-theme-gray-medium hover:bg-theme-gray-medium/30">
              <TableHead className="text-gray-300 font-semibold">Player</TableHead>
              <TableHead className="text-gray-300 font-semibold text-center">Level</TableHead>
              <TableHead className="text-gray-300 font-semibold text-center">Matches</TableHead>
              <TableHead className="text-gray-300 font-semibold text-center">Win Rate</TableHead>
              <TableHead className="text-gray-300 font-semibold text-center">K/D</TableHead>
              <TableHead className="text-gray-300 font-semibold text-center">Form</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.roster?.map((player, idx) => (
              <TableRow 
                key={`${player.player_id}-${idx}`} 
                className="border-theme-gray-medium hover:bg-theme-gray-medium/30 cursor-pointer"
                onClick={() => handlePlayerClick(player, team.name)}
              >
                <TableCell className="py-3">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={player.avatar || '/placeholder.svg'} 
                      alt={player.nickname} 
                      className="w-8 h-8 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                    <span className="text-white font-medium text-sm">{player.nickname}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {player.skill_level ? (
                    <Badge variant="outline" className={`text-xs ${getSkillLevelColor(player.skill_level)}`}>
                      {player.skill_level}
                    </Badge>
                  ) : (
                    <span className="text-gray-500 text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-white text-sm">
                    {player.total_matches || '-'}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  {player.win_rate ? (
                    <span className="text-green-400 text-sm font-semibold">
                      {Math.round(player.win_rate)}%
                    </span>
                  ) : (
                    <span className="text-gray-500 text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {player.kd_ratio ? (
                    <span className="text-blue-400 text-sm font-semibold">
                      {player.kd_ratio.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-gray-500 text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {getFormBadge(player.recent_form) || (
                    <span className="text-gray-500 text-xs">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <>
      <Card className="bg-theme-gray-dark border-theme-gray-medium overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <User className="h-6 w-6 mr-3" />
            Player Lineups
          </h2>

          {/* Enhanced Stats Indicator */}
          {(hasEnhancedStats(team1.roster) || hasEnhancedStats(team2.roster)) && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center text-green-400 text-sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                <span>Enhanced statistics available for some players</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderTeamTable(team1, 0)}
            {renderTeamTable(team2, 1)}
          </div>
        </div>
      </Card>

      <PlayerDetailsModal
        player={selectedPlayer}
        teamName={selectedTeamName}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
