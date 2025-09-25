import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Award, Target, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PlayerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  esportType: string;
}

interface EnhancedPlayerData {
  player_id: string;
  name: string;
  slug?: string;
  image_url?: string;
  nationality?: string;
  role?: string;
  team_id?: string;
  team_name?: string;
  career_stats: Record<string, any>;
  recent_stats: Record<string, any>;
  kda_ratio?: number;
  avg_kills?: number;
  avg_deaths?: number;
  avg_assists?: number;
  headshot_percentage?: number;
  clutch_success_rate?: number;
  earnings?: number;
  achievements: Record<string, any>[];
}

export const PlayerDetailsModal: React.FC<PlayerDetailsModalProps> = ({
  isOpen,
  onClose,
  playerId,
  esportType
}) => {
  const [playerData, setPlayerData] = useState<EnhancedPlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && playerId) {
      fetchPlayerData();
      fetchRecentMatches();
    }
  }, [isOpen, playerId, esportType]);

  const fetchPlayerData = async () => {
    try {
      // Check if this is a PandaScore player (numeric ID for games like Valorant, CS2, etc.)
      const isPandaScorePlayer = /^\d+$/.test(playerId);
      
      if (isPandaScorePlayer) {
        // Use new RPC function for PandaScore players
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'get_pandascore_player_details',
          { p_player_id: parseInt(playerId) }
        );

        if (rpcError) {
          console.error('Error calling RPC:', rpcError);
          return;
        }

        if (rpcData && typeof rpcData === 'object' && rpcData !== null) {
          const response = rpcData as any;
          
          if (response.found) {
            const profile = response.profile;
            const stats = response.stats;
            
            setPlayerData({
              player_id: profile.id.toString(),
              name: profile.name || 'Unknown Player',
              slug: profile.slug || undefined,
              image_url: profile.image_url || undefined,
              nationality: profile.nationality || undefined,
              role: profile.role || undefined,
              team_id: profile.team?.id?.toString() || undefined,
              team_name: profile.team?.name || undefined,
              career_stats: {
                total_matches: stats.total_matches,
                wins: stats.wins,
                losses: stats.losses,
                win_rate: stats.win_rate,
                videogame: profile.videogame
              },
              recent_stats: {
                recent_form: stats.recent_form,
                win_rate: stats.win_rate,
                matches_played: stats.total_matches
              },
              kda_ratio: undefined, // PandaScore doesn't have individual KDA in this aggregation
              avg_kills: undefined,
              avg_deaths: undefined,
              avg_assists: undefined,
              achievements: []
            });

            // Set recent matches from last_10_matches
            if (stats.last_10_matches && Array.isArray(stats.last_10_matches)) {
              setRecentMatches(stats.last_10_matches.map((match: any) => ({
                tournament_name: match.tournament || 'Unknown Tournament',
                opponent_team: match.opponent || 'Unknown Opponent',
                result: match.result === 'W' ? 'win' : 'loss',
                date: match.date,
                match_id: match.matchId,
                map_name: 'N/A', // PandaScore doesn't provide map info in this context
                kills: 0, // Individual stats not available
                deaths: 0,
                assists: 0,
                kda_ratio: 0
              })));
            }
            return;
          }
        }
      }

      // Fallback to original method for other types of players
      const { data, error } = await supabase
        .from('pandascore_players_master')
        .select('*')
        .eq('id', parseInt(playerId))
        .maybeSingle();

      if (error) {
        console.error('Error fetching player data:', error);
        return;
      }

      if (data) {
        setPlayerData({
          player_id: data.id.toString(),
          name: data.name || 'Unknown Player',
          slug: data.slug || undefined,
          image_url: data.image_url || undefined,
          nationality: data.nationality || undefined,
          role: data.role || undefined,
          team_id: data.current_team_id?.toString() || undefined,
          team_name: data.current_team_name || undefined,
          career_stats: {},
          recent_stats: {},
          achievements: []
        });
      }
    } catch (error) {
      console.error('Error fetching player data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentMatches = async () => {
    try {
      // Since pandascore_player_matches doesn't exist, 
      // we'll leave recent matches empty for now
      setRecentMatches([]);
    } catch (error) {
      console.error('Error fetching recent matches:', error);
    }
  };

  const getKDAColor = (kda: number) => {
    if (kda >= 1.5) return 'text-green-500';
    if (kda >= 1.0) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getPerformanceLevel = (value: number, thresholds: number[]) => {
    if (value >= thresholds[2]) return { level: 'Excellent', color: 'bg-green-500' };
    if (value >= thresholds[1]) return { level: 'Good', color: 'bg-yellow-500' };
    if (value >= thresholds[0]) return { level: 'Average', color: 'bg-orange-500' };
    return { level: 'Below Average', color: 'bg-red-500' };
  };

  if (!isOpen) return null;

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
              <AvatarImage src={playerData.image_url} alt={playerData.name} />
              <AvatarFallback className="text-lg font-bold">
                {playerData.name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-2xl text-white">{playerData.name}</DialogTitle>
               <div className="flex items-center space-x-2 mt-1">
                 {playerData.team_name && (
                   <Badge variant="outline">Team {playerData.team_name}</Badge>
                 )}
                 {playerData.role && (
                   <Badge variant="secondary">Pos/Role {playerData.role}</Badge>
                 )}
                 {playerData.nationality && (
                    <img 
                      src={`https://flagcdn.com/24x18/${playerData.nationality.toLowerCase()}.png`} 
                      alt={`Flag of ${playerData.nationality}`} 
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
          <TabsList className="grid w-full grid-cols-2 bg-gray-800/50 border border-gray-700/50">
            <TabsTrigger 
              value="statistics" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25 transition-all duration-250 text-white"
            >
              Statistics
            </TabsTrigger>
            <TabsTrigger 
              value="matches" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/25 transition-all duration-250 text-white"
            >
              Recent Matches
            </TabsTrigger>
          </TabsList>


          <TabsContent value="statistics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card border border-border">
                <CardHeader>
                  <CardTitle className="text-white">Career Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(playerData.career_stats || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize text-gray-400">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="font-medium text-white">
                        {typeof value === 'number' ? value.toFixed(2) : String(value)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-card border border-border">
                <CardHeader>
                  <CardTitle className="text-white">Recent Form</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(playerData.recent_stats || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize text-gray-400">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="font-medium text-white">
                        {key.toLowerCase().includes('form') && typeof value === 'string' ? (
                          <div className="flex items-center gap-1">
                            {value.split('').map((char, index) => (
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
                        ) : (
                          typeof value === 'number' ? value.toFixed(2) : String(value)
                        )}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="matches" className="space-y-4">
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle className="text-white">Recent Match History</CardTitle>
              </CardHeader>
              <CardContent>
                {recentMatches.length > 0 ? (
                  <div className="space-y-3">
                    {recentMatches.map((match, index) => (
                      <div key={index} className="flex items-center p-3 border border-theme-gray-medium rounded-lg bg-theme-gray-dark/50">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            match.result === 'win' ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <div>
                            <div className="font-medium text-white">{match.tournament_name}</div>
                            <div className="text-sm text-gray-400">
                              vs {match.opponent_team}
                            </div>
                          </div>
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