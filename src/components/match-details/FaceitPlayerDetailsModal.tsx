import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!isOpen) return null;

  const playerData = enhancedData?.found ? enhancedData : null;
  const profile = playerData?.profile || player;
  const careerStats = playerData?.career_stats;
  const recentStats = playerData?.recent_stats;
  const recentMatches = playerData?.recent_matches || [];
  const isCalculatedData = playerData?.data_source === 'calculated';

  if (!playerData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Player Not Found</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Player statistics are not available at this time.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-theme-gray-dark border-theme-gray-medium max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.avatar || '/placeholder.svg'} alt={profile.nickname} />
              <AvatarFallback className="text-lg font-bold">
                {profile.nickname.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-2xl text-white">{profile.nickname}</DialogTitle>
              <div className="flex items-center space-x-2 mt-1">
                {teamName && (
                  <Badge variant="outline" className="text-white">Team {teamName}</Badge>
                )}
                {profile.skill_level && (
                  <Badge variant="secondary">Level {profile.skill_level}</Badge>
                )}
                {profile.country && (
                  <img 
                    src={`https://flagcdn.com/24x18/${profile.country.toLowerCase()}.png`} 
                    alt={`Flag of ${profile.country}`} 
                    className="h-4 w-6 rounded-sm border border-theme-gray-light" 
                    loading="lazy" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }} 
                  />
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="statistics" className="w-full">
          <TabsList className="flex bg-gradient-to-br from-[#1e1e2a] to-[#2a2a3a] rounded-[10px] p-1.5 gap-1.5">
            <TabsTrigger 
              value="statistics" 
              className="flex-1 text-center py-2.5 rounded-lg font-medium text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] cursor-pointer transition-all duration-250 ease data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#7a5cff] data-[state=active]:to-[#8e6fff] data-[state=active]:text-white data-[state=active]:shadow-[0_0_12px_rgba(122,92,255,0.4)] data-[state=active]:font-semibold hover:bg-[#7a5cff]/15 hover:text-white"
            >
              Statistics
            </TabsTrigger>
            <TabsTrigger 
              value="matches" 
              className="flex-1 text-center py-2.5 rounded-lg font-medium text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] cursor-pointer transition-all duration-250 ease data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#7a5cff] data-[state=active]:to-[#8e6fff] data-[state=active]:text-white data-[state=active]:shadow-[0_0_12px_rgba(122,92,255,0.4)] data-[state=active]:font-semibold hover:bg-[#7a5cff]/15 hover:text-white"
            >
              Recent Matches
            </TabsTrigger>
          </TabsList>

          <TabsContent value="statistics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-b from-[#3D2B5F] to-[#1F1535] border border-white/5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_12px_rgba(139,92,246,0.3)] transition-all duration-[250ms] ease-in-out hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_15px_rgba(139,92,246,0.4)]">
                <CardHeader>
                  <CardTitle className="text-white">Career Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {careerStats && (
                    <>
                      <div className="flex justify-between">
                        <span className="capitalize text-white">Total Matches</span>
                        <span className="font-medium text-white">{careerStats.total_matches}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="capitalize text-white">Wins</span>
                        <span className="font-medium text-white">{careerStats.total_wins}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="capitalize text-white">Losses</span>
                        <span className="font-medium text-white">{careerStats.total_losses}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="capitalize text-white">Win Rate</span>
                        <span className="font-medium text-white">{careerStats.win_rate.toFixed(1)}%</span>
                      </div>
                      {careerStats.avg_kd_ratio !== null && careerStats.avg_kd_ratio !== undefined && (
                        <div className="flex justify-between">
                          <span className="capitalize text-white">Avg K/D</span>
                          <span className="font-medium text-white">{careerStats.avg_kd_ratio.toFixed(2)}</span>
                        </div>
                      )}
                      {careerStats.avg_headshots_percent !== null && careerStats.avg_headshots_percent !== undefined && (
                        <div className="flex justify-between">
                          <span className="capitalize text-white">Avg Headshots</span>
                          <span className="font-medium text-white">{careerStats.avg_headshots_percent.toFixed(1)}%</span>
                        </div>
                      )}
                      {careerStats.current_win_streak !== null && careerStats.current_win_streak !== undefined && (
                        <div className="flex justify-between">
                          <span className="capitalize text-white">Current Streak</span>
                          <span className="font-medium text-white">{careerStats.current_win_streak}</span>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-b from-[#3D2B5F] to-[#1F1535] border border-white/5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_12px_rgba(139,92,246,0.3)] transition-all duration-[250ms] ease-in-out hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_15px_rgba(139,92,246,0.4)]">
                <CardHeader>
                  <CardTitle className="text-white">Recent Form</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentStats && (
                    <>
                      <div className="flex justify-between">
                        <span className="capitalize text-white">Matches (30d)</span>
                        <span className="font-medium text-white">{recentStats.matches_30d}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="capitalize text-white">Wins (30d)</span>
                        <span className="font-medium text-white">{recentStats.wins_30d}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="capitalize text-white">Win Rate (30d)</span>
                        <span className="font-medium text-white">{recentStats.win_rate_30d}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="capitalize text-white">Recent Form</span>
                        <span className="font-medium text-white">
                          <div className="flex items-center gap-1">
                            {recentStats.recent_form.split('').map((char, index) => (
                              <span
                                key={index}
                                className={`
                                  text-xs font-bold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center
                                  ${char === 'W' ? 'bg-green-500 text-white' : 
                                    char === 'L' ? 'bg-red-500 text-white' : 
                                    'bg-gray-500 text-white'}
                                `}
                              >
                                {char}
                              </span>
                            ))}
                          </div>
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="matches" className="space-y-4">
            <Card className="bg-gradient-to-b from-[#3D2B5F] to-[#1F1535] border border-white/5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_12px_rgba(139,92,246,0.3)] transition-all duration-[250ms] ease-in-out hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_15px_rgba(139,92,246,0.4)]">
              <CardHeader>
                <CardTitle className="text-white">Recent Match History</CardTitle>
              </CardHeader>
              <CardContent>
                {recentMatches.length > 0 ? (
                  <div className="space-y-3">
                    {recentMatches.map((match) => (
                      <div key={match.matchId} className="flex items-center p-3 border border-theme-gray-medium rounded-lg bg-theme-gray-dark/50">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className={`w-3 h-3 rounded-full ${
                            match.result === 'W' ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <div className="flex-1">
                            <div className="font-medium text-white">{match.competition}</div>
                            <div className="text-sm text-gray-400">
                              vs {match.opponent}
                            </div>
                          </div>
                          {match.kills !== undefined && match.kills !== null && (
                            <div className="text-sm text-gray-400">
                              {match.kills}/{match.deaths}/{match.assists}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    No recent match data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};