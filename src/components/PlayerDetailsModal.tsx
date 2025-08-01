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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={playerData.image_url} alt={playerData.name} />
              <AvatarFallback className="text-lg font-bold">
                {playerData.name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-2xl">{playerData.name}</DialogTitle>
              <div className="flex items-center space-x-2 mt-1">
                {playerData.team_name && (
                  <Badge variant="outline">{playerData.team_name}</Badge>
                )}
                {playerData.role && (
                  <Badge variant="secondary">{playerData.role}</Badge>
                )}
                {playerData.nationality && (
                  <Badge variant="outline">{playerData.nationality}</Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
            <TabsTrigger value="matches">Recent Matches</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* KDA Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">K/D/A Ratio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <span className={getKDAColor(playerData.kda_ratio || 0)}>
                      {playerData.kda_ratio?.toFixed(2) || 'N/A'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {playerData.avg_kills?.toFixed(1)}/{playerData.avg_deaths?.toFixed(1)}/{playerData.avg_assists?.toFixed(1)}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Rating */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Performance Rating</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {playerData.recent_stats?.rating && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Recent Form</span>
                          <span className="text-lg font-bold">{playerData.recent_stats.rating.toFixed(2)}</span>
                        </div>
                        <Progress 
                          value={Math.min(playerData.recent_stats.rating * 50, 100)} 
                          className="h-2" 
                        />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Headshot Accuracy */}
              {playerData.headshot_percentage && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Target className="h-4 w-4 mr-1" />
                      Headshot %
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {(playerData.headshot_percentage * 100).toFixed(1)}%
                    </div>
                    <Progress 
                      value={playerData.headshot_percentage * 100} 
                      className="h-2 mt-2" 
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {playerData.clutch_success_rate && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {(playerData.clutch_success_rate * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Clutch Success</div>
                    </div>
                  )}
                  
                  {playerData.recent_stats?.adr && (
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {playerData.recent_stats.adr.toFixed(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">Average Damage</div>
                    </div>
                  )}

                  {playerData.recent_stats?.matches_played && (
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {playerData.recent_stats.matches_played}
                      </div>
                      <div className="text-sm text-muted-foreground">Recent Matches</div>
                    </div>
                  )}

                  {playerData.earnings && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">
                        ${playerData.earnings.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Career Earnings</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Career Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(playerData.career_stats || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize text-muted-foreground">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="font-medium">
                        {typeof value === 'number' ? value.toFixed(2) : String(value)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Form</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(playerData.recent_stats || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize text-muted-foreground">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="font-medium">
                        {typeof value === 'number' ? value.toFixed(2) : String(value)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="matches" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Match History</CardTitle>
              </CardHeader>
              <CardContent>
                {recentMatches.length > 0 ? (
                  <div className="space-y-3">
                    {recentMatches.map((match, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            match.result === 'win' ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <div>
                            <div className="font-medium">{match.tournament_name}</div>
                            <div className="text-sm text-muted-foreground">
                              vs {match.opponent_team} • {match.map_name}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {match.kills}/{match.deaths}/{match.assists}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {match.kda_ratio?.toFixed(2)} KDA
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent match data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Achievements & Awards
                </CardTitle>
              </CardHeader>
              <CardContent>
                {playerData.achievements && playerData.achievements.length > 0 ? (
                  <div className="space-y-3">
                    {playerData.achievements.map((achievement, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Award className="h-8 w-8 text-yellow-500" />
                        <div>
                          <div className="font-medium">{achievement.title}</div>
                          <div className="text-sm text-muted-foreground">{achievement.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No achievements data available
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