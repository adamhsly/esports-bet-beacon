
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, Target, Trophy, TrendingUp, Zap } from 'lucide-react';

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

interface PlayerDetailsModalProps {
  player?: Player;
  teamName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PlayerDetailsModal: React.FC<PlayerDetailsModalProps> = ({
  player,
  teamName,
  isOpen,
  onClose
}) => {
  if (!player) return null;

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-theme-gray-dark border-theme-gray-medium max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={player.avatar || '/placeholder.svg'} alt={player.nickname} />
              <AvatarFallback className="bg-theme-gray-medium text-white">
                {player.nickname.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-bold">{player.nickname}</h3>
              <p className="text-sm text-gray-400">{teamName}</p>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Skill Level */}
          {player.skill_level && (
            <div className="flex items-center justify-between p-3 bg-theme-gray-medium/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-gray-300">Skill Level</span>
              </div>
              <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">
                Level {player.skill_level}
              </Badge>
            </div>
          )}

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total Matches */}
            {player.total_matches !== undefined && (
              <div className="p-3 bg-theme-gray-medium/30 rounded-lg text-center">
                <div className="flex items-center justify-center mb-1">
                  <User className="h-4 w-4 text-blue-400 mr-1" />
                </div>
                <div className="text-lg font-bold text-white">{player.total_matches}</div>
                <div className="text-xs text-gray-400">Total Matches</div>
              </div>
            )}

            {/* Win Rate */}
            {player.win_rate !== undefined && (
              <div className="p-3 bg-theme-gray-medium/30 rounded-lg text-center">
                <div className="flex items-center justify-center mb-1">
                  <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
                </div>
                <div className="text-lg font-bold text-green-400">{Math.round(player.win_rate)}%</div>
                <div className="text-xs text-gray-400">Win Rate</div>
              </div>
            )}

            {/* K/D Ratio */}
            {player.kd_ratio !== undefined && (
              <div className="p-3 bg-theme-gray-medium/30 rounded-lg text-center">
                <div className="flex items-center justify-center mb-1">
                  <Target className="h-4 w-4 text-red-400 mr-1" />
                </div>
                <div className="text-lg font-bold text-red-400">{player.kd_ratio.toFixed(2)}</div>
                <div className="text-xs text-gray-400">K/D Ratio</div>
              </div>
            )}

            {/* Recent Form */}
            {player.recent_form && (
              <div className="p-3 bg-theme-gray-medium/30 rounded-lg text-center">
                <div className="flex items-center justify-center mb-1">
                  <Zap className="h-4 w-4 text-purple-400 mr-1" />
                </div>
                <div className="flex justify-center">{getFormBadge(player.recent_form)}</div>
                <div className="text-xs text-gray-400 mt-1">Recent Form</div>
              </div>
            )}
          </div>

          {/* Additional Stats Info */}
          {(!player.total_matches || player.total_matches === 0) && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-xs text-yellow-400 text-center">
                Enhanced statistics not available for this player
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
