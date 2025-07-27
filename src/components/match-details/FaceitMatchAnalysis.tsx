import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Target, 
  Crosshair, 
  Users, 
  TrendingUp,
  Clock,
  Bomb,
  DollarSign,
  Zap,
  Award
} from 'lucide-react';

interface PlayerPerformance {
  playerId: string;
  nickname: string;
  teamFaction: 'faction1' | 'faction2';
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  kdRatio: number;
  adr: number;
  headshots: number;
  headshotPercent: number;
  mvpRounds: number;
  rating: number;
  firstKills: number;
  firstDeaths: number;
  clutchRoundsWon: number;
  clutchRoundsAttempted: number;
  damageDealt: number;
  flashAssists: number;
}

interface RoundResult {
  roundNumber: number;
  mapName: string;
  winningFaction: 'faction1' | 'faction2';
  roundType: 'pistol' | 'eco' | 'force' | 'full_buy' | 'anti_eco';
  roundEndReason: 'elimination' | 'bomb_defused' | 'bomb_exploded' | 'time_expired' | 'surrender';
  roundDuration: number;
  faction1ScoreBefore: number;
  faction2ScoreBefore: number;
  faction1ScoreAfter: number;
  faction2ScoreAfter: number;
  bombPlanted: boolean;
  firstKillPlayer: string;
  roundMvp: string;
}

interface MapResult {
  mapName: string;
  faction1Score: number;
  faction2Score: number;
  winnerFaction: 'faction1' | 'faction2';
  mapDuration: number;
}

interface FaceitMatchAnalysisProps {
  matchId: string;
  teams: Array<{
    name: string;
    logo?: string;
    faction: 'faction1' | 'faction2';
  }>;
  playerPerformances: PlayerPerformance[];
  roundResults: RoundResult[];
  mapResults: MapResult[];
  matchResult?: {
    winnerFaction: 'faction1' | 'faction2';
    finalScore: {
      faction1: number;
      faction2: number;
    };
  };
}

export const FaceitMatchAnalysis: React.FC<FaceitMatchAnalysisProps> = ({
  matchId,
  teams,
  playerPerformances,
  roundResults,
  mapResults,
  matchResult
}) => {
  const getTeamByFaction = (faction: 'faction1' | 'faction2') => 
    teams.find(team => team.faction === faction);

  const getPlayersByTeam = (faction: 'faction1' | 'faction2') =>
    playerPerformances.filter(player => player.teamFaction === faction);

  const getRatingColor = (rating: number) => {
    if (rating >= 1.2) return 'text-green-400';
    if (rating >= 1.0) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderPlayerStatsTable = () => (
    <div className="space-y-6">
      {teams.map((team) => {
        const teamPlayers = getPlayersByTeam(team.faction);
        
        return (
          <Card key={team.faction} className="bg-theme-gray-dark border-theme-gray-medium">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <img 
                  src={team.logo || '/placeholder.svg'} 
                  alt={team.name} 
                  className="w-12 h-12 object-contain rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">{team.name}</h3>
                  {matchResult && (
                    <Badge 
                      variant="outline" 
                      className={matchResult.winnerFaction === team.faction 
                        ? 'bg-green-500/20 text-green-400 border-green-400/30'
                        : 'bg-red-500/20 text-red-400 border-red-400/30'
                      }
                    >
                      {matchResult.winnerFaction === team.faction ? (
                        <>
                          <Trophy className="h-3 w-3 mr-1" />
                          WINNER
                        </>
                      ) : (
                        'DEFEATED'
                      )}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-theme-gray-medium">
                      <TableHead className="text-gray-300">Player</TableHead>
                      <TableHead className="text-gray-300 text-center">Rating</TableHead>
                      <TableHead className="text-gray-300 text-center">K/D/A</TableHead>
                      <TableHead className="text-gray-300 text-center">ADR</TableHead>
                      <TableHead className="text-gray-300 text-center">HS%</TableHead>
                      <TableHead className="text-gray-300 text-center">FK</TableHead>
                      <TableHead className="text-gray-300 text-center">Clutch</TableHead>
                      <TableHead className="text-gray-300 text-center">MVPs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamPlayers
                      .sort((a, b) => b.rating - a.rating)
                      .map((player) => (
                        <TableRow key={player.playerId} className="border-theme-gray-medium hover:bg-theme-gray-medium/50">
                          <TableCell>
                            <div className="font-semibold text-white">{player.nickname}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-semibold ${getRatingColor(player.rating)}`}>
                              {player.rating.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="text-white font-semibold">
                              {player.kills}/{player.deaths}/{player.assists}
                            </div>
                            <div className="text-xs text-gray-400">
                              K/D: {player.kdRatio.toFixed(2)}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="text-white font-semibold">
                              {Math.round(player.adr)}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="text-white font-semibold">
                              {Math.round(player.headshotPercent)}%
                            </div>
                            <div className="text-xs text-gray-400">
                              ({player.headshots} HS)
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="text-white font-semibold">
                              {player.firstKills}
                            </div>
                            <div className="text-xs text-gray-400">
                              FD: {player.firstDeaths}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="text-white font-semibold">
                              {player.clutchRoundsWon}/{player.clutchRoundsAttempted}
                            </div>
                            <div className="text-xs text-gray-400">
                              {player.clutchRoundsAttempted > 0 
                                ? `${Math.round((player.clutchRoundsWon / player.clutchRoundsAttempted) * 100)}%`
                                : '0%'
                              }
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Award className="h-3 w-3 text-yellow-400" />
                              <span className="text-yellow-400 font-semibold">
                                {player.mvpRounds}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );

  const renderRoundHistory = () => (
    <Card className="bg-theme-gray-dark border-theme-gray-medium">
      <div className="p-6">
        <h3 className="text-lg font-bold text-white mb-4">Round-by-Round Results</h3>
        
        <div className="space-y-4">
          {mapResults.map((map, mapIndex) => (
            <div key={mapIndex} className="border border-theme-gray-medium rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-white">{map.mapName}</h4>
                <div className="flex items-center gap-4">
                  <span className="text-orange-400 font-bold">
                    {map.faction1Score} - {map.faction2Score}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {formatDuration(map.mapDuration)}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-10 md:grid-cols-15 lg:grid-cols-30 gap-1">
                {roundResults
                  .filter(round => round.mapName === map.mapName)
                  .map((round) => (
                    <div
                      key={round.roundNumber}
                      className={`w-6 h-6 rounded-sm flex items-center justify-center text-xs font-bold ${
                        round.winningFaction === 'faction1'
                          ? 'bg-blue-500 text-white'
                          : 'bg-orange-500 text-white'
                      }`}
                      title={`Round ${round.roundNumber}: ${getTeamByFaction(round.winningFaction)?.name} - ${round.roundEndReason} (${round.roundType})`}
                    >
                      {round.roundNumber}
                    </div>
                  ))}
              </div>
              
              <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                    <span>{getTeamByFaction('faction1')?.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
                    <span>{getTeamByFaction('faction2')?.name}</span>
                  </div>
                </div>
                <span>
                  Winner: {getTeamByFaction(map.winnerFaction)?.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );

  const renderMatchOverview = () => (
    <Card className="bg-theme-gray-dark border-theme-gray-medium">
      <div className="p-6">
        <h3 className="text-lg font-bold text-white mb-4">Match Overview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400 mb-2">
              {matchResult?.finalScore.faction1 || 0} - {matchResult?.finalScore.faction2 || 0}
            </div>
            <div className="text-gray-400">Final Score</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400 mb-2">
              {mapResults.length}
            </div>
            <div className="text-gray-400">Maps Played</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400 mb-2">
              {roundResults.length}
            </div>
            <div className="text-gray-400">Total Rounds</div>
          </div>
        </div>
        
        {matchResult && (
          <div className="mt-6 p-4 bg-green-500/10 border border-green-400/30 rounded-lg text-center">
            <Trophy className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <div className="text-xl font-bold text-green-400">
              {getTeamByFaction(matchResult.winnerFaction)?.name} Wins!
            </div>
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      {renderMatchOverview()}
      
      <Tabs defaultValue="players" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="players">Player Statistics</TabsTrigger>
          <TabsTrigger value="rounds">Round History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="players" className="space-y-4">
          {renderPlayerStatsTable()}
        </TabsContent>
        
        <TabsContent value="rounds" className="space-y-4">
          {renderRoundHistory()}
        </TabsContent>
      </Tabs>
    </div>
  );
};