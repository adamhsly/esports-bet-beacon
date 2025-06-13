
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Star, Trophy, Target, Gamepad2 } from 'lucide-react';

interface FaceitPlayer {
  player_id: string;
  nickname: string;
  avatar?: string;
  skill_level?: number;
  membership?: string;
  elo?: number;
  games?: number;
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

const PlayerRow: React.FC<{ player: FaceitPlayer; teamName: string }> = ({ player, teamName }) => {
  const skillLevel = player.skill_level || 1;
  const membershipTier = player.membership || 'free';
  const playerElo = player.elo || 800;
  const gamesPlayed = player.games || 0;

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
    </TableRow>
  );
};

export const FaceitPlayerLineupTable: React.FC<FaceitPlayerLineupTableProps> = ({ teams }) => {
  console.log('📋 Rendering FACEIT Player Lineup Table:', teams);

  const team1 = teams[0];
  const team2 = teams[1];
  const hasTeam1Data = team1?.roster && team1.roster.length > 0;
  const hasTeam2Data = team2?.roster && team2.roster.length > 0;
  const hasAnyData = hasTeam1Data || hasTeam2Data;

  return (
    <Card className="bg-theme-gray-dark border border-theme-gray-medium">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl text-white">
          <Users className="h-5 w-5 text-orange-400" />
          Team Lineups
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div>
            {team1?.name}: {team1?.roster?.length || 0} players
          </div>
          <div>•</div>
          <div>
            {team2?.name}: {team2?.roster?.length || 0} players
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {!hasAnyData ? (
          <div className="text-center py-8 text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <p className="text-lg font-medium">No player lineup data available</p>
            <p className="text-sm">Player rosters may not be synced yet for this match</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Team 1 */}
            {hasTeam1Data && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <img 
                    src={team1.logo} 
                    alt={team1.name}
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                  <h3 className="text-lg font-semibold text-white">{team1.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    {team1.roster?.length} players
                  </Badge>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow className="border-theme-gray-medium">
                      <TableHead className="text-gray-300">Player</TableHead>
                      <TableHead className="text-gray-300">Skill Level</TableHead>
                      <TableHead className="text-gray-300">Membership</TableHead>
                      <TableHead className="text-gray-300">ELO Rating</TableHead>
                      <TableHead className="text-gray-300">Games Played</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {team1.roster?.map((player) => (
                      <PlayerRow 
                        key={player.player_id} 
                        player={player} 
                        teamName={team1.name}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* Team 2 */}
            {hasTeam2Data && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <img 
                    src={team2.logo} 
                    alt={team2.name}
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                  <h3 className="text-lg font-semibold text-white">{team2.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    {team2.roster?.length} players
                  </Badge>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow className="border-theme-gray-medium">
                      <TableHead className="text-gray-300">Player</TableHead>
                      <TableHead className="text-gray-300">Skill Level</TableHead>
                      <TableHead className="text-gray-300">Membership</TableHead>
                      <TableHead className="text-gray-300">ELO Rating</TableHead>
                      <TableHead className="text-gray-300">Games Played</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {team2.roster?.map((player) => (
                      <PlayerRow 
                        key={player.player_id} 
                        player={player} 
                        teamName={team2.name}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
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
      </CardContent>
    </Card>
  );
};
