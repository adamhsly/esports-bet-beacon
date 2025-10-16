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
  country?: string;
  membership?: string;
  faceit_elo?: number;
}

interface PlayerDetailsModalProps {
  player?: Player;
  teamName?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface EnhancedPlayerData {
  found: boolean;
  data_source?: 'synced' | 'calculated';
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
    avg_kd_ratio?: number | null;
    avg_headshots_percent?: number | null;
    current_win_streak?: number | null;
    longest_win_streak?: number | null;
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
    map?: string;
    result: string;
    opponent: string;
    competition: string;
    competitionType?: string;
    kills?: number;
    deaths?: number;
    assists?: number;
    kd_ratio?: number;
    adr?: number;
    mvps?: number;
    headshots_percent?: number;
    elo_change?: number;
  }>;
}

// Helper function to get color for skill level
const getSkillLevelColor = (level?: number): string => {
  if (!level) return 'bg-gray-500/20 text-gray-400 border-gray-400/30';
  
  if (level >= 9) return 'bg-purple-500/20 text-purple-300 border-purple-400/30';
  if (level >= 7) return 'bg-orange-500/20 text-orange-300 border-orange-400/30';
  if (level >= 5) return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30';
  if (level >= 3) return 'bg-green-500/20 text-green-300 border-green-400/30';
  return 'bg-red-500/20 text-red-300 border-red-400/30';
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

      console.log('Fetched player data:', data);
      setEnhancedData(data as unknown as EnhancedPlayerData);
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
  const isCalculatedData = playerData?.data_source === 'calculated';

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
                {isCalculatedData && (
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-400/30">
                    Calculated Stats
                  </Badge>
                )}
              </div>
              <p className="text-theme-gray-light">{teamName}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex bg-gradient-to-br from-[#1e1e2a] to-[#2a2a3a] rounded-[10px] p-1.5 gap-1.5">
            <TabsTrigger value="overview" className="flex-1 text-center py-2.5 rounded-lg font-medium text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] cursor-pointer transition-all duration-250 ease data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#7a5cff] data-[state=active]:to-[#8e6fff] data-[state=active]:text-white data-[state=active]:shadow-[0_0_12px_rgba(122,92,255,0.4)] data-[state=active]:font-semibold hover:bg-[#7a5cff]/15 hover:text-white">Overview</TabsTrigger>
            <TabsTrigger value="statistics" className="flex-1 text-center py-2.5 rounded-lg font-medium text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] cursor-pointer transition-all duration-250 ease data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#7a5cff] data-[state=active]:to-[#8e6fff] data-[state=active]:text-white data-[state=active]:shadow-[0_0_12px_rgba(122,92,255,0.4)] data-[state=active]:font-semibold hover:bg-[#7a5cff]/15 hover:text-white">Statistics</TabsTrigger>
            <TabsTrigger value="matches" className="flex-1 text-center py-2.5 rounded-lg font-medium text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] cursor-pointer transition-all duration-250 ease data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#7a5cff] data-[state=active]:to-[#8e6fff] data-[state=active]:text-white data-[state=active]:shadow-[0_0_12px_rgba(122,92,255,0.4)] data-[state=active]:font-semibold hover:bg-[#7a5cff]/15 hover:text-white">Recent Matches</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-b from-[#3D2B5F] to-[#1F1535] border border-white/5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_12px_rgba(139,92,246,0.3)] transition-all duration-[250ms] ease-in-out hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_15px_rgba(139,92,246,0.4)]">
                <CardContent className="p-3">
                  <div className="text-xs text-theme-gray-light mb-1">Skill Level</div>
                  <Badge className={`${getSkillLevelColor(profile.skill_level)} text-white`}>
                    Level {profile.skill_level || 'N/A'}
                  </Badge>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-b from-[#3D2B5F] to-[#1F1535] border border-white/5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_12px_rgba(139,92,246,0.3)] transition-all duration-[250ms] ease-in-out hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_15px_rgba(139,92,246,0.4)]">
                <CardContent className="p-3">
                  <div className="text-xs text-theme-gray-light mb-1">ELO</div>
                  <div className={`text-lg font-semibold ${!profile.faceit_elo ? 'text-muted-foreground' : 'text-white'}`}>
                    {profile.faceit_elo || 'N/A'}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-b from-[#3D2B5F] to-[#1F1535] border border-white/5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_12px_rgba(139,92,246,0.3)] transition-all duration-[250ms] ease-in-out hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_15px_rgba(139,92,246,0.4)]">
                <CardContent className="p-3">
                  <div className="text-xs text-theme-gray-light mb-1">Win Rate</div>
                  <div className="text-lg font-semibold text-white">
                    {careerStats ? `${careerStats.win_rate.toFixed(1)}%` : `${(player.win_rate || 0).toFixed(1)}%`}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-b from-[#3D2B5F] to-[#1F1535] border border-white/5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_12px_rgba(139,92,246,0.3)] transition-all duration-[250ms] ease-in-out hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_15px_rgba(139,92,246,0.4)]">
                <CardContent className="p-3">
                  <div className="text-xs text-theme-gray-light mb-1">K/D Ratio</div>
                  <div className={`text-lg font-semibold ${!careerStats?.avg_kd_ratio ? 'text-muted-foreground' : 'text-white'}`}>
                    {careerStats?.avg_kd_ratio ? careerStats.avg_kd_ratio.toFixed(2) : 'N/A'}
                  </div>
                  {!careerStats?.avg_kd_ratio && isCalculatedData && (
                    <p className="text-xs text-muted-foreground mt-1">Requires sync</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Form */}
            {(recentStats?.recent_form || player.recent_form_string || player.recent_form) && (
              <Card className="bg-gradient-to-b from-[#3D2B5F] to-[#1F1535] border border-white/5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_12px_rgba(139,92,246,0.3)] transition-all duration-[250ms] ease-in-out hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_15px_rgba(139,92,246,0.4)]">
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
            <Card className="bg-gradient-to-b from-[#3D2B5F] to-[#1F1535] border border-white/5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_12px_rgba(139,92,246,0.3)] transition-all duration-[250ms] ease-in-out hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_15px_rgba(139,92,246,0.4)]">
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
                      <span className={`font-semibold ${!careerStats.avg_kd_ratio ? 'text-muted-foreground' : 'text-white'}`}>
                        {careerStats.avg_kd_ratio ? careerStats.avg_kd_ratio.toFixed(2) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-theme-gray-light">Avg HS%:</span>
                      <span className={`font-semibold ${!careerStats.avg_headshots_percent ? 'text-muted-foreground' : 'text-white'}`}>
                        {careerStats.avg_headshots_percent ? careerStats.avg_headshots_percent.toFixed(1) + '%' : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-theme-gray-light">Current Streak:</span>
                      <span className="text-white font-semibold">
                        {careerStats.current_win_streak ?? 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-theme-gray-light">Longest Streak:</span>
                      <span className={`font-semibold ${!careerStats.longest_win_streak ? 'text-muted-foreground' : 'text-white'}`}>
                        {careerStats.longest_win_streak ?? 'N/A'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {recentStats && (
                  <Card className="bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] border border-white/5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_12px_rgba(73,168,255,0.3)] transition-all duration-[250ms] ease-in-out hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_15px_rgba(73,168,255,0.4)]">
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
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="bg-gradient-to-b from-[#3D2B5F] to-[#1F1535] border border-white/5 rounded-xl">
                <CardContent className="p-6 text-center text-theme-gray-light">
                  No detailed statistics available
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="matches" className="space-y-4">
            {recentMatches.length > 0 ? (
              <Card className="bg-gradient-to-b from-[#3D2B5F] to-[#1F1535] border border-white/5 rounded-xl">
                <CardHeader>
                  <CardTitle className="text-white">Match History</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/5 hover:bg-white/5">
                          <TableHead className="text-theme-gray-light">Date</TableHead>
                          <TableHead className="text-theme-gray-light">Map</TableHead>
                          <TableHead className="text-theme-gray-light">Result</TableHead>
                          <TableHead className="text-theme-gray-light">Opponent</TableHead>
                          <TableHead className="text-theme-gray-light text-right">K</TableHead>
                          <TableHead className="text-theme-gray-light text-right">D</TableHead>
                          <TableHead className="text-theme-gray-light text-right">A</TableHead>
                          <TableHead className="text-theme-gray-light text-right">K/D</TableHead>
                          <TableHead className="text-theme-gray-light text-right">ELO</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentMatches.map((match) => (
                          <TableRow key={match.matchId} className="border-white/5 hover:bg-white/5">
                            <TableCell className="text-white font-medium">{formatMatchDate(match.date)}</TableCell>
                            <TableCell className="text-theme-gray-light">{match.map || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={match.result === 'W' ? 'default' : 'destructive'}>
                                {match.result}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-white">{match.opponent}</TableCell>
                            <TableCell className={`text-right ${!match.kills ? 'text-muted-foreground' : 'text-white'}`}>
                              {match.kills ?? '-'}
                            </TableCell>
                            <TableCell className={`text-right ${!match.deaths ? 'text-muted-foreground' : 'text-white'}`}>
                              {match.deaths ?? '-'}
                            </TableCell>
                            <TableCell className={`text-right ${!match.assists ? 'text-muted-foreground' : 'text-white'}`}>
                              {match.assists ?? '-'}
                            </TableCell>
                            <TableCell className={`text-right ${!match.kd_ratio ? 'text-muted-foreground' : 'text-white'}`}>
                              {match.kd_ratio ? match.kd_ratio.toFixed(2) : '-'}
                            </TableCell>
                            <TableCell className={`text-right ${!match.elo_change ? 'text-muted-foreground' : ''}`}>
                              {match.elo_change ? (
                                <span className={match.elo_change > 0 ? 'text-green-600' : 'text-red-600'}>
                                  {match.elo_change > 0 ? '+' : ''}{match.elo_change}
                                </span>
                              ) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-to-b from-[#3D2B5F] to-[#1F1535] border border-white/5 rounded-xl">
                <CardContent className="p-6 text-center text-theme-gray-light">
                  No recent matches available
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};