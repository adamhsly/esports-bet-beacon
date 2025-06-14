
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Trophy, Target } from 'lucide-react';

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
  const team1 = teams[0] || { name: 'Team 1', roster: [] };
  const team2 = teams[1] || { name: 'Team 2', roster: [] };

  const PlayerCard = ({ player, teamName }: { player: Player; teamName: string }) => (
    <div className="bg-theme-gray-medium/30 rounded-lg p-3 space-y-2">
      <div className="flex items-center space-x-3">
        <img 
          src={player.avatar || '/placeholder.svg'} 
          alt={player.nickname} 
          className="w-8 h-8 rounded-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">{player.nickname}</p>
          <p className="text-xs text-gray-400">{teamName}</p>
        </div>
        {player.skill_level && (
          <Badge variant="outline" className="text-xs px-2 py-0">
            LVL {player.skill_level}
          </Badge>
        )}
      </div>
      
      {(player.total_matches || player.win_rate || player.kd_ratio) && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          {player.total_matches && (
            <div className="text-center">
              <div className="text-gray-400">Matches</div>
              <div className="text-white font-semibold">{player.total_matches}</div>
            </div>
          )}
          {player.win_rate && (
            <div className="text-center">
              <div className="text-gray-400">Win Rate</div>
              <div className="text-green-400 font-semibold">{Math.round(player.win_rate)}%</div>
            </div>
          )}
          {player.kd_ratio && (
            <div className="text-center">
              <div className="text-gray-400">K/D</div>
              <div className="text-blue-400 font-semibold">{player.kd_ratio.toFixed(2)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Card className="bg-theme-gray-dark border-theme-gray-medium">
      <div className="p-4">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
          <User className="h-5 w-5 mr-2" />
          Player Lineups
        </h3>
        
        <div className="space-y-4">
          {/* Team 1 */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <img 
                src={team1.logo || team1.avatar || '/placeholder.svg'} 
                alt={team1.name} 
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              <h4 className="font-semibold text-white text-sm">{team1.name}</h4>
              <Badge variant="outline" className="text-xs">
                {team1.roster?.length || 0} players
              </Badge>
            </div>
            <div className="space-y-2">
              {team1.roster?.map((player, idx) => (
                <PlayerCard key={`${player.player_id}-${idx}`} player={player} teamName={team1.name} />
              ))}
            </div>
          </div>

          {/* Team 2 */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <img 
                src={team2.logo || team2.avatar || '/placeholder.svg'} 
                alt={team2.name} 
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              <h4 className="font-semibold text-white text-sm">{team2.name}</h4>
              <Badge variant="outline" className="text-xs">
                {team2.roster?.length || 0} players
              </Badge>
            </div>
            <div className="space-y-2">
              {team2.roster?.map((player, idx) => (
                <PlayerCard key={`${player.player_id}-${idx}`} player={player} teamName={team2.name} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
