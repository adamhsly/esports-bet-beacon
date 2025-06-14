
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';
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
}

interface Team {
  id?: string;
  name: string;
  logo?: string;
  avatar?: string;
  roster?: Player[];
}

interface FaceitMobilePlayerLineupProps {
  teams: Team[];
}

export const FaceitMobilePlayerLineup: React.FC<FaceitMobilePlayerLineupProps> = ({ teams }) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeamName, setSelectedTeamName] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const team1 = teams[0] || { name: 'Team 1', roster: [] };
  const team2 = teams[1] || { name: 'Team 2', roster: [] };

  const handlePlayerClick = (player: Player, teamName: string) => {
    setSelectedPlayer(player);
    setSelectedTeamName(teamName);
    setIsModalOpen(true);
  };

  const PlayerRow = ({ player, teamName }: { player: Player; teamName: string }) => (
    <div 
      className="flex items-center justify-between p-1.5 bg-theme-gray-medium/30 rounded cursor-pointer hover:bg-theme-gray-medium/50 transition-colors"
      onClick={() => handlePlayerClick(player, teamName)}
    >
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        <img 
          src={player.avatar || '/placeholder.svg'} 
          alt={player.nickname} 
          className="w-6 h-6 rounded-full object-cover flex-shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-xs truncate">{player.nickname}</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-1.5 flex-shrink-0">
        {player.skill_level && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
            {player.skill_level}
          </Badge>
        )}
        {player.win_rate && (
          <span className="text-green-400 font-semibold text-[10px]">
            {Math.round(player.win_rate)}%
          </span>
        )}
      </div>
    </div>
  );

  const TeamColumn = ({ team, side }: { team: Team; side: 'left' | 'right' }) => (
    <div className="flex-1">
      <div className="flex items-center space-x-1.5 mb-2 px-1">
        <img 
          src={team.logo || team.avatar || '/placeholder.svg'} 
          alt={team.name} 
          className="w-4 h-4 object-contain flex-shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }}
        />
        <h4 className="font-semibold text-white text-xs truncate flex-1">{team.name}</h4>
        <Badge variant="outline" className="text-[10px] px-1 h-4 flex-shrink-0">
          {team.roster?.length || 0}
        </Badge>
      </div>
      <div className="space-y-1">
        {team.roster?.map((player, idx) => (
          <PlayerRow 
            key={`${player.player_id}-${idx}`} 
            player={player} 
            teamName={team.name} 
          />
        ))}
      </div>
    </div>
  );

  return (
    <>
      <Card className="bg-theme-gray-dark border-theme-gray-medium">
        <div className="p-2">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center">
            <User className="h-4 w-4 mr-1.5" />
            Player Lineups
          </h3>
          
          <div className="grid grid-cols-2 gap-2">
            <TeamColumn team={team1} side="left" />
            <TeamColumn team={team2} side="right" />
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
