
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Star, Trophy, Target, Gamepad2, TrendingUp, Zap, Award } from 'lucide-react';

interface FaceitPlayer {
  player_id: string;
  nickname: string;
  avatar?: string;
  skill_level?: number;
  membership?: string;
  elo?: number;
  games?: number;
  // Enhanced stats
  total_matches?: number;
  total_wins?: number;
  win_rate?: number;
  avg_kd_ratio?: number;
  avg_headshots_percent?: number;
  longest_win_streak?: number;
  current_win_streak?: number;
  recent_form?: 'unknown' | 'poor' | 'average' | 'good' | 'excellent';
  recent_results?: string[];
}

interface FaceitTeam {
  name: string;
  logo: string;
  roster?: FaceitPlayer[];
}

interface FaceitPlayerLineupTableProps {
  teams: FaceitTeam[];
}

const getSkillLevelColor = (level: number): string => {
  if (level >= 9) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (level >= 7) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  if (level >= 5) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  if (level >= 3) return 'bg-green-500/20 text-green-400 border-green-500/30';
  return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
};

const getMembershipBadgeStyle = (membership: string): string => {
  switch (membership?.toLowerCase()) {
    case 'premium':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'plus':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const getFormColor = (form: string): string => {
  switch (form) {
    case 'excellent': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'good': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'average': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'poor': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const getFormIcon = (form: string) => {
  switch (form) {
    case 'excellent': return <TrendingUp className="h-3 w-3" />;
    case 'good': return <Trophy className="h-3 w-3" />;
    case 'average': return <Target className="h-3 w-3" />;
    case 'poor': return <Target className="h-3 w-3" />;
    default: return <Target className="h-3 w-3" />;
  }
};

const PlayerRow: React.FC<{ player: FaceitPlayer; teamName: string }> = ({ player, teamName }) => {
  const skillLevel = player.skill_level || 1;
  const membershipTier = player.membership || 'free';
  const playerElo = player.elo || 800;
  const gamesPlayed = player.games || player.total_matches || 0;
  const hasEnhancedStats = (player.total_matches && player.total_matches > 0) || false;

  return (
    <TableRow className="hover:bg-theme-gray-medium/30 transition-colors">
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={player.avatar} alt={player.nickname} />
            <AvatarFallback className="bg-theme-gray-medium text-white text-xs">
              {player.nickname.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-white">{player.nickname}</div>
            <div className="text-xs text-gray-400">{teamName}</div>
          </div>
        </div>
      </TableCell>
      
      <TableCell>
        <Badge variant="outline" className={`${getSkillLevelColor(skillLevel)} text-xs`}>
          <Star className="h-3 w-3 mr-1" />
          Level {skillLevel}
        </Badge>
      </TableCell>
      
      <TableCell>
        <Badge variant="outline" className={`${getMembershipBadgeStyle(membershipTier)} text-xs`}>
          <Trophy className="h-3 w-3 mr-1" />
          {membershipTier.charAt(0).toUpperCase() + membershipTier.slice(1)}
        </Badge>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-1 text-purple-400 font-medium">
          <Target className="h-3 w-3" />
          {playerElo.toLocaleString()}
        </div>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-1 text-green-400">
          <Gamepad2 className="h-3 w-3" />
          {gamesPlayed.toLocaleString()}
        </div>
      </TableCell>

      {/* Enhanced Stats Columns */}
      <TableCell>
        {hasEnhancedStats && player.win_rate !== undefined ? (
          <div className="space-y-1">
            <div className="text-sm font-medium">{player.win_rate.toFixed(1)}%</div>
            <Progress value={player.win_rate} className="h-1" />
          </div>
        ) : (
          <span className="text-xs text-gray-500">N/A</span>
        )}
      </TableCell>

      <TableCell>
        {hasEnhancedStats && player.avg_kd_ratio !== undefined ? (
          <div className={`text-sm font-medium ${player.avg_kd_ratio >= 1.0 ? 'text-green-400' : 'text-red-400'}`}>
            {player.avg_kd_ratio.toFixed(2)}
          </div>
        ) : (
          <span className="text-xs text-gray-500">N/A</span>
        )}
      </TableCell>

      <TableCell>
        {hasEnhancedStats && player.avg_headshots_percent !== undefined ? (
          <div className="space-y-1">
            <div className="text-sm font-medium">{player.avg_headshots_percent.toFixed(1)}%</div>
            <Progress value={player.avg_headshots_percent} className="h-1" />
          </div>
        ) : (
          <span className="text-xs text-gray-500">N/A</span>
        )}
      </TableCell>

      <TableCell>
        {hasEnhancedStats && player.recent_form && player.recent_form !== 'unknown' ? (
          <Badge variant="outline" className={`${getFormColor(player.recent_form)} text-xs`}>
            {getFormIcon(player.recent_form)}
            <span className="ml-1 capitalize">{player.recent_form}</span>
          </Badge>
        ) : (
          <span className="text-xs text-gray-500">N/A</span>
        )}
      </TableCell>

      <TableCell>
        {hasEnhancedStats && player.current_win_streak && player.current_win_streak > 0 ? (
          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
            <Zap className="h-3 w-3 mr-1" />
            {player.current_win_streak}W
          </Badge>
        ) : (
          <span className="text-xs text-gray-500">-</span>
        )}
      </TableCell>

      <TableCell>
        {hasEnhancedStats && player.recent_results && player.recent_results.length > 0 ? (
          <div className="flex space-x-1">
            {player.recent_results.slice(0, 5).map((result, index) => (
              <div
                key={index}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  result === '1' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}
              >
                {result === '1' ? 'W' : 'L'}
              </div>
            ))}
          </div>
        ) : (
          <span className="text-xs text-gray-500">N/A</span>
        )}
      </TableCell>
    </TableRow>
  );
};

export const FaceitPlayerLineupTable: React.FC<FaceitPlayerLineupTableProps> = ({ teams }) => {
  console.log('📋 Rendering Enhanced FACEIT Player Lineup Table:', teams);

  const team1 = teams[0];
  const team2 = teams[1];
  const hasTeam1Data = team1?.roster && team1.roster.length > 0;
  const hasTeam2Data = team2?.roster && team2.roster.length > 0;
  const hasAnyData = hasTeam1Data || hasTeam2Data;

  // Calculate enhanced stats coverage
  const getEnhancedStatsCount = (roster: FaceitPlayer[]) => {
    return roster.filter(player => player.total_matches && player.total_matches > 0).length;
  };

  const team1EnhancedCount = hasTeam1Data ? getEnhancedStatsCount(team1.roster!) : 0;
  const team2EnhancedCount = hasTeam2Data ? getEnhancedStatsCount(team2.roster!) : 0;

  const renderTeamTable = (team: FaceitTeam, enhancedCount: number) => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <img 
            src={team.logo} 
            alt={team.name}
            className="w-6 h-6 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
          <h3 className="text-lg font-semibold text-white">{team.name}</h3>
          <Badge variant="outline" className="text-xs">
            {team.roster?.length} players
          </Badge>
          {enhancedCount > 0 && (
            <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-400">
              <Award className="h-3 w-3 mr-1" />
              {enhancedCount} enhanced
            </Badge>
          )}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-theme-gray-medium">
              <TableHead className="text-gray-300 min-w-[160px]">Player</TableHead>
              <TableHead className="text-gray-300 min-w-[100px]">Skill Level</TableHead>
              <TableHead className="text-gray-300 min-w-[100px]">Membership</TableHead>
              <TableHead className="text-gray-300 min-w-[90px]">ELO Rating</TableHead>
              <TableHead className="text-gray-300 min-w-[90px]">Games Played</TableHead>
              <TableHead className="text-gray-300 min-w-[100px]">Win Rate</TableHead>
              <TableHead className="text-gray-300 min-w-[80px]">K/D</TableHead>
              <TableHead className="text-gray-300 min-w-[100px]">Headshot %</TableHead>
              <TableHead className="text-gray-300 min-w-[90px]">Form</TableHead>
              <TableHead className="text-gray-300 min-w-[90px]">Win Streak</TableHead>
              <TableHead className="text-gray-300 min-w-[120px]">Recent Results</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.roster?.map((player) => (
              <PlayerRow 
                key={player.player_id} 
                player={player} 
                teamName={team.name}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <Card className="bg-theme-gray-dark border border-theme-gray-medium">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl text-white">
          <Users className="h-5 w-5 text-orange-400" />
          Enhanced Team Lineups
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div>
            {team1?.name}: {team1?.roster?.length || 0} players ({team1EnhancedCount} enhanced)
          </div>
          <div>•</div>
          <div>
            {team2?.name}: {team2?.roster?.length || 0} players ({team2EnhancedCount} enhanced)
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-8">
        {!hasAnyData ? (
          <div className="text-center py-8 text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <p className="text-lg font-medium">No player lineup data available</p>
            <p className="text-sm">Player rosters may not be synced yet for this match</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Team 1 */}
            {hasTeam1Data && renderTeamTable(team1, team1EnhancedCount)}
            
            {/* Team 2 */}
            {hasTeam2Data && renderTeamTable(team2, team2EnhancedCount)}
            
            {/* Show message if only one team has data */}
            {(hasTeam1Data && !hasTeam2Data) && (
              <div className="text-center py-4 text-gray-400 bg-theme-gray-medium/20 rounded-lg">
                <p>Player data not available for {team2?.name}</p>
              </div>
            )}
            
            {(!hasTeam1Data && hasTeam2Data) && (
              <div className="text-center py-4 text-gray-400 bg-theme-gray-medium/20 rounded-lg">
                <p>Player data not available for {team1?.name}</p>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Stats Legend */}
        {(team1EnhancedCount > 0 || team2EnhancedCount > 0) && (
          <div className="mt-6 p-4 bg-theme-gray-medium/20 rounded-lg">
            <h4 className="text-sm font-medium text-white mb-2">Enhanced Statistics Legend</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-400">
              <div>• Win Rate: Match win percentage</div>
              <div>• K/D: Average kill/death ratio</div>
              <div>• Headshot %: Headshot accuracy</div>
              <div>• Form: Recent performance trend</div>
              <div>• Win Streak: Current consecutive wins</div>
              <div>• Recent Results: Last 5 match outcomes</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
