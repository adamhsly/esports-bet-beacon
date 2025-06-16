
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, Target, Trophy, TrendingUp, Zap, Calendar } from 'lucide-react';
import type { PlayerMatchHistory } from '@/lib/supabaseFaceitApi';

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
  match_history?: PlayerMatchHistory[];
}

interface PlayerDetailsModalProps {
  player?: Player;
  teamName?: string;
  isOpen: boolean;
  onClose: () => void;
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

// Helper function to get match result color
const getMatchResultColor = (result: 'win' | 'loss'): string => {
  return result === 'win' 
    ? 'bg-green-500/20 text-green-300 border-green-400/30'
    : 'bg-red-500/20 text-red-300 border-red-400/30';
};

// Helper function to format date
const formatMatchDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
};

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
      <DialogContent className="bg-theme-gray-dark border-theme-gray-medium max-w-4xl max-h-[90vh] p-6">
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
        
        <div className="space-y-4 mt-4 overflow-y-auto max-h-[70vh]">
          {/* Skill Level */}
          {player.skill_level && (
            <div className="flex items-center justify-between p-3 bg-theme-gray-medium/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-gray-300">Skill Level</span>
              </div>
              <Badge variant="outline" className={`text-xs ${getSkillLevelColor(player.skill_level)}`}>
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
            {(player.recent_form || player.recent_form_string) && (
              <div className="p-3 bg-theme-gray-medium/30 rounded-lg text-center">
                <div className="flex items-center justify-center mb-1">
                  <Zap className="h-4 w-4 text-purple-400 mr-1" />
                </div>
                <div className="flex justify-center">
                  {getFormBadge(player.recent_form_string || player.recent_form)}
                </div>
                <div className="text-xs text-gray-400 mt-1">Recent Form</div>
              </div>
            )}
          </div>

          {/* Recent Match History - Condensed Table */}
          {player.match_history && player.match_history.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-blue-400" />
                <h4 className="text-sm font-semibold text-white">Last 5 Matches</h4>
              </div>
              
              <div className="bg-theme-gray-medium/20 rounded-lg border border-theme-gray-medium/30 overflow-hidden">
                <ScrollArea className="w-full h-72">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-theme-gray-medium/30 hover:bg-transparent">
                        <TableHead className="text-gray-400 text-xs p-3">Result</TableHead>
                        <TableHead className="text-gray-400 text-xs p-3">Teams</TableHead>
                        <TableHead className="text-gray-400 text-xs p-3">Competition</TableHead>
                        <TableHead className="text-gray-400 text-xs p-3 text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {player.match_history.slice(0, 5).map((match) => (
                        <TableRow 
                          key={match.id}
                          className="border-theme-gray-medium/20 hover:bg-theme-gray-medium/10"
                        >
                          <TableCell className="p-3">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getMatchResultColor(match.match_result)}`}
                            >
                              {match.match_result?.toUpperCase() || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="p-3">
                            <div className="text-xs text-white truncate max-w-36">
                              <div className="font-medium">{match.team_name || 'Team'}</div>
                              <div className="text-gray-400 text-[10px]">vs {match.opponent_team_name || 'Opponent'}</div>
                            </div>
                          </TableCell>
                          <TableCell className="p-3">
                            <div className="text-xs text-gray-300 truncate max-w-28">
                              {match.competition_name || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="p-3 text-right">
                            <div className="text-xs text-gray-400">
                              {formatMatchDate(match.match_date)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="h-4" />
                </ScrollArea>
              </div>
            </div>
          )}

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
