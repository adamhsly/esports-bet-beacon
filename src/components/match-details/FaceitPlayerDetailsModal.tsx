import React, { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Target, Trophy, TrendingUp, Zap, Calendar } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
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

interface EnhancedPlayerData {
  found: boolean;
  profile?: {
    player_id: string;
    nickname: string;
    avatar?: string;
    country?: string;
    membership?: string;
    skill_level?: number;
    faceit_elo?: number;
  };
  career_stats?: {
    total_matches: number;
    total_wins: number;
    total_losses: number;
    win_rate: number;
    avg_kd_ratio: number;
    avg_headshots_percent: number;
    current_win_streak: number;
    longest_win_streak: number;
  };
  recent_stats?: {
    matches_30d: number;
    wins_30d: number;
    losses_30d: number;
    win_rate_30d: number;
    recent_form: string;
    form_quality: string;
  };
  map_stats?: Record<string, any>;
  recent_matches?: Array<{
    matchId: string;
    date: string;
    map: string;
    result: string;
    opponent: string;
    competition: string;
    kills: number;
    deaths: number;
    assists: number;
    kd_ratio: number;
    adr: number;
    mvps: number;
    headshots_percent: number;
    elo_change: number;
  }>;
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
const getMatchResultColor = (result: string): string => {
  return result === 'win' 
    ? 'bg-green-500/20 text-green-300 border-green-400/30'
    : 'bg-red-500/20 text-red-300 border-red-400/30';
};

const getFormColor = (quality: string): string => {
  switch (quality) {
    case 'excellent': return 'text-green-400 bg-green-400/10 border-green-400/30';
    case 'good': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
    case 'poor': return 'text-red-400 bg-red-400/10 border-red-400/30';
    default: return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
  }
};

// Helper function to format date
const formatMatchDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
};

export const FaceitPlayerDetailsModal: React.FC<PlayerDetailsModalProps> = ({
  player,
  teamName,
  isOpen,
  onClose
}) => {
  const [enhancedData, setEnhancedData] = useState<EnhancedPlayerData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && player?.player_id) {
      fetchEnhancedPlayerData();
    }
  }, [isOpen, player?.player_id]);

  const fetchEnhancedPlayerData = async () => {
    if (!player?.player_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_faceit_player_details', {
        p_player_id: player.player_id
      });

      if (error) {
        console.error('Error fetching enhanced player data:', error);
        return;
      }

      setEnhancedData(data);
    } catch (error) {
      console.error('Error fetching enhanced player data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!player) return null;

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-theme-gray-dark border-theme-gray-medium">
          <div className="flex items-center justify-center py-8">
            <div className="text-white">Loading player details...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const playerData = enhancedData?.found ? enhancedData : null;
  const profile = playerData?.profile || player;
  const careerStats = playerData?.career_stats;
  const recentStats = playerData?.recent_stats;
  const recentMatches = playerData?.recent_matches || [];

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-theme-gray-dark border-theme-gray-medium">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile.avatar || '/placeholder.svg'} alt={profile.nickname} />
              <AvatarFallback className="bg-theme-gray-medium text-white">
                {profile.nickname.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{profile.nickname}</h2>
                {profile.country && (
                  <span className="text-xs px-2 py-1 bg-theme-gray-medium/50 rounded text-theme-gray-light">
                    {profile.country}
                  </span>
                )}
                {profile.membership && (
                  <Badge variant="outline" className="text-xs">
                    {profile.membership}
                  </Badge>
                )}
              </div>
              <p className="text-theme-gray-light">{teamName}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-theme-gray-medium/30">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
            <TabsTrigger value="matches">Recent Matches</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-theme-gray-medium/30 border-theme-gray-medium/50">
                <CardContent className="p-3">
                  <div className="text-xs text-theme-gray-light mb-1">Skill Level</div>
                  <Badge className={`${getSkillLevelColor(profile.skill_level)} text-white`}>
                    Level {profile.skill_level || 'N/A'}
                  </Badge>
                </CardContent>
              </Card>
              
              <Card className="bg-theme-gray-medium/30 border-theme-gray-medium/50">
                <CardContent className="p-3">
                  <div className="text-xs text-theme-gray-light mb-1">ELO</div>
                  <div className="text-lg font-semibold text-white">{profile.faceit_elo || 'N/A'}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-theme-gray-medium/30 border-theme-gray-medium/50">
                <CardContent className="p-3">
                  <div className="text-xs text-theme-gray-light mb-1">Win Rate</div>
                  <div className="text-lg font-semibold text-white">
                    {careerStats ? `${careerStats.win_rate.toFixed(1)}%` : `${(player.win_rate || 0).toFixed(1)}%`}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-theme-gray-medium/30 border-theme-gray-medium/50">
                <CardContent className="p-3">
                  <div className="text-xs text-theme-gray-light mb-1">K/D Ratio</div>
                  <div className="text-lg font-semibold text-white">
                    {careerStats ? careerStats.avg_kd_ratio.toFixed(2) : (player.kd_ratio || 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Form */}
            {(recentStats?.recent_form || player.recent_form_string || player.recent_form) && (
              <Card className="bg-theme-gray-medium/30 border-theme-gray-medium/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white">Recent Form</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      {(recentStats?.recent_form || player.recent_form_string || player.recent_form || '').split('').map((result, idx) => (
                        <span 
                          key={idx} 
                          className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded ${
                            result === 'W' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                          }`}
                        >
                          {result}
                        </span>
                      ))}
                    </div>
                    {recentStats?.form_quality && (
                      <Badge className={`ml-2 ${getFormColor(recentStats.form_quality)}`}>
                        {recentStats.form_quality}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="statistics" className="space-y-4">
            {careerStats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-theme-gray-medium/30 border-theme-gray-medium/50">
                  <CardHeader>
                    <CardTitle className="text-white">Career Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-theme-gray-light">Total Matches:</span>
                      <span className="text-white font-semibold">{careerStats.total_matches}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-theme-gray-light">Wins:</span>
                      <span className="text-white font-semibold">{careerStats.total_wins}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-theme-gray-light">Losses:</span>
                      <span className="text-white font-semibold">{careerStats.total_losses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-theme-gray-light">Win Rate:</span>
                      <span className="text-white font-semibold">{careerStats.win_rate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-theme-gray-light">Avg K/D:</span>
                      <span className="text-white font-semibold">{careerStats.avg_kd_ratio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-theme-gray-light">Avg HS%:</span>
                      <span className="text-white font-semibold">{careerStats.avg_headshots_percent.toFixed(1)}%</span>
                    </div>
                  </CardContent>
                </Card>

                {recentStats && (
                  <Card className="bg-theme-gray-medium/30 border-theme-gray-medium/50">
                    <CardHeader>
                      <CardTitle className="text-white">Recent Performance (30d)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-theme-gray-light">Matches:</span>
                        <span className="text-white font-semibold">{recentStats.matches_30d}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-theme-gray-light">Wins:</span>
                        <span className="text-white font-semibold">{recentStats.wins_30d}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-theme-gray-light">Losses:</span>
                        <span className="text-white font-semibold">{recentStats.losses_30d}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-theme-gray-light">Win Rate:</span>
                        <span className="text-white font-semibold">{recentStats.win_rate_30d}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-theme-gray-light">Current Streak:</span>
                        <span className="text-white font-semibold">{careerStats.current_win_streak}W</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-theme-gray-light">Best Streak:</span>
                        <span className="text-white font-semibold">{careerStats.longest_win_streak}W</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="bg-theme-gray-medium/30 border-theme-gray-medium/50">
                <CardContent className="p-6 text-center">
                  <p className="text-theme-gray-light">Enhanced statistics not available for this player.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="matches" className="space-y-4">
            {recentMatches.length > 0 ? (
              <Card className="bg-theme-gray-medium/30 border-theme-gray-medium/50">
                <CardHeader>
                  <CardTitle className="text-white">Recent Match History</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-theme-gray-light">Result</TableHead>
                          <TableHead className="text-theme-gray-light">Map</TableHead>
                          <TableHead className="text-theme-gray-light">Opponent</TableHead>
                          <TableHead className="text-theme-gray-light">K/D/A</TableHead>
                          <TableHead className="text-theme-gray-light">ADR</TableHead>
                          <TableHead className="text-theme-gray-light">ELO</TableHead>
                          <TableHead className="text-theme-gray-light">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentMatches.map((match, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getMatchResultColor(match.result)}`}
                              >
                                {match.result.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-theme-gray-light">{match.map || 'Unknown'}</TableCell>
                            <TableCell className="text-theme-gray-light">{match.opponent || 'Unknown'}</TableCell>
                            <TableCell className="text-theme-gray-light">
                              {match.kills}/{match.deaths}/{match.assists}
                            </TableCell>
                            <TableCell className="text-theme-gray-light">{match.adr?.toFixed(1) || 'N/A'}</TableCell>
                            <TableCell className="text-theme-gray-light">
                              {match.elo_change ? (
                                <span className={match.elo_change > 0 ? 'text-green-400' : 'text-red-400'}>
                                  {match.elo_change > 0 ? '+' : ''}{match.elo_change}
                                </span>
                              ) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-theme-gray-light">
                              {formatMatchDate(match.date)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              // Fallback to old match history format if enhanced data not available
              player.match_history && player.match_history.length > 0 ? (
                <Card className="bg-theme-gray-medium/30 border-theme-gray-medium/50">
                  <CardHeader>
                    <CardTitle className="text-white">Recent Match History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-theme-gray-light">Result</TableHead>
                            <TableHead className="text-theme-gray-light">Teams</TableHead>
                            <TableHead className="text-theme-gray-light">Competition</TableHead>
                            <TableHead className="text-theme-gray-light">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {player.match_history.slice(0, 5).map((match) => (
                            <TableRow key={match.id}>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getMatchResultColor(match.match_result)}`}
                                >
                                  {match.match_result?.toUpperCase() || 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-theme-gray-light">
                                <div className="text-xs">
                                  <div className="font-medium">{match.team_name || 'Team'}</div>
                                  <div className="text-gray-400">vs {match.opponent_team_name || 'Opponent'}</div>
                                </div>
                              </TableCell>
                              <TableCell className="text-theme-gray-light">
                                {match.competition_name || 'N/A'}
                              </TableCell>
                              <TableCell className="text-theme-gray-light">
                                {formatMatchDate(match.match_date)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-theme-gray-medium/30 border-theme-gray-medium/50">
                  <CardContent className="p-6 text-center">
                    <p className="text-theme-gray-light">No recent match data available.</p>
                  </CardContent>
                </Card>
              )
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};