
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Target, Crosshair, Users, TrendingUp } from 'lucide-react';

interface FaceitPlayerPerformanceTableProps {
  teams: Array<{
    name: string;
    logo?: string;
    avatar?: string;
    roster?: Array<{
      nickname: string;
      player_id: string;
      skill_level?: number;
      stats?: {
        kills?: number;
        deaths?: number;
        assists?: number;
        adr?: number;
        kd_ratio?: number;
        headshots?: number;
        headshots_percent?: number;
        mvps?: number;
        rating?: number;
      };
    }>;
  }>;
  matchResult?: {
    winner: string;
    score: {
      faction1: number;
      faction2: number;
    };
  };
}

export const FaceitPlayerPerformanceTable: React.FC<FaceitPlayerPerformanceTableProps> = ({ 
  teams, 
  matchResult 
}) => {
  const getTeamBadgeClass = (teamIndex: number) => {
    if (!matchResult) return 'bg-gray-500/20 text-gray-400 border-gray-400/30';
    
    const isWinner = matchResult.winner === (teamIndex === 0 ? 'faction1' : 'faction2');
    return isWinner 
      ? 'bg-green-500/20 text-green-400 border-green-400/30'
      : 'bg-red-500/20 text-red-400 border-red-400/30';
  };

  const getRatingColor = (rating?: number) => {
    if (!rating) return 'text-gray-400';
    if (rating >= 1.2) return 'text-green-400';
    if (rating >= 1.0) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getKDColor = (kdRatio?: number) => {
    if (!kdRatio) return 'text-gray-400';
    if (kdRatio >= 1.5) return 'text-green-400';
    if (kdRatio >= 1.0) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {teams.map((team, teamIndex) => (
        <Card key={team.name} className="bg-theme-gray-dark border border-theme-gray-medium overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <img 
                src={team.logo || team.avatar || '/placeholder.svg'} 
                alt={team.name} 
                className="w-12 h-12 object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">{team.name}</h3>
                <Badge 
                  variant="outline" 
                  className={getTeamBadgeClass(teamIndex)}
                >
                  {matchResult?.winner === (teamIndex === 0 ? 'faction1' : 'faction2') ? (
                    <>
                      <Trophy className="h-3 w-3 mr-1" />
                      WINNER
                    </>
                  ) : (
                    'DEFEATED'
                  )}
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-theme-gray-medium">
                    <TableHead className="text-gray-300">Player</TableHead>
                    <TableHead className="text-gray-300 text-center">Rating</TableHead>
                    <TableHead className="text-gray-300 text-center">K/D</TableHead>
                    <TableHead className="text-gray-300 text-center">ADR</TableHead>
                    <TableHead className="text-gray-300 text-center">HS%</TableHead>
                    <TableHead className="text-gray-300 text-center">MVPs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.roster?.map((player) => (
                    <TableRow key={player.player_id} className="border-theme-gray-medium hover:bg-theme-gray-medium/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-theme-gray-medium rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4 text-gray-400" />
                          </div>
                          <div>
                            <div className="font-semibold text-white">{player.nickname}</div>
                            {player.skill_level && (
                              <div className="text-xs text-orange-400">Level {player.skill_level}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-semibold ${getRatingColor(player.stats?.rating)}`}>
                          {player.stats?.rating ? player.stats.rating.toFixed(2) : 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          <div className={`font-semibold ${getKDColor(player.stats?.kd_ratio)}`}>
                            {player.stats?.kd_ratio ? player.stats.kd_ratio.toFixed(2) : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-400">
                            {player.stats?.kills || 0}/{player.stats?.deaths || 0}/{player.stats?.assists || 0}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Target className="h-3 w-3 text-gray-400" />
                          <span className="text-white font-semibold">
                            {player.stats?.adr ? Math.round(player.stats.adr) : 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Crosshair className="h-3 w-3 text-gray-400" />
                          <span className="text-white font-semibold">
                            {player.stats?.headshots_percent ? `${Math.round(player.stats.headshots_percent)}%` : 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <TrendingUp className="h-3 w-3 text-yellow-400" />
                          <span className="text-yellow-400 font-semibold">
                            {player.stats?.mvps || 0}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                        No player performance data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
