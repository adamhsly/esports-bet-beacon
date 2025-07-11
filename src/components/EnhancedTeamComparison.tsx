import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Trophy, Target, Zap, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TeamComparisonProps {
  team1Id: string;
  team2Id: string;
  esportType: string;
  className?: string;
}

interface TeamData {
  team_id: string;
  name?: string; // Made optional since it's not in the detailed stats table
  logo_url?: string;
  recent_win_rate?: number;
  map_stats?: Record<string, any>;
  eco_round_win_rate?: number;
  pistol_round_win_rate?: number;
  recent_matches_count?: number;
  recent_avg_rating?: number;
  major_wins?: number;
  prize_money?: number;
  current_roster?: any[];
}

interface HeadToHeadData {
  team1_wins: number;
  team2_wins: number;
  total_matches: number;
}

export const EnhancedTeamComparison: React.FC<TeamComparisonProps> = ({
  team1Id,
  team2Id,
  esportType,
  className = ""
}) => {
  const [team1Data, setTeam1Data] = useState<TeamData | null>(null);
  const [team2Data, setTeam2Data] = useState<TeamData | null>(null);
  const [headToHead, setHeadToHead] = useState<HeadToHeadData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (team1Id && team2Id) {
      fetchTeamData();
      fetchHeadToHead();
    }
  }, [team1Id, team2Id, esportType]);

  const fetchTeamData = async () => {
    try {
      const [team1Response, team2Response] = await Promise.all([
        supabase
          .from('pandascore_team_detailed_stats')
          .select('*')
          .eq('team_id', team1Id)
          .eq('esport_type', esportType)
          .single(),
        supabase
          .from('pandascore_team_detailed_stats')
          .select('*')
          .eq('team_id', team2Id)
          .eq('esport_type', esportType)
          .single()
      ]);

      if (team1Response.data) {
        setTeam1Data(team1Response.data as TeamData);
      }
      if (team2Response.data) {
        setTeam2Data(team2Response.data as TeamData);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHeadToHead = async () => {
    try {
      // Since pandascore_head_to_head table doesn't exist, 
      // we'll calculate head-to-head from match history
      const { data, error } = await supabase
        .from('pandascore_matches')
        .select('*')
        .eq('esport_type', esportType)
        .or(`teams->>0.eq.${team1Id},teams->>1.eq.${team1Id}`)
        .or(`teams->>0.eq.${team2Id},teams->>1.eq.${team2Id}`)
        .eq('status', 'finished');

      if (data && data.length > 0) {
        // Filter matches that involve both teams
        const directMatches = data.filter(match => {
          const teams = match.teams as any;
          const teamIds = [teams[0]?.id, teams[1]?.id].filter(Boolean);
          return teamIds.includes(team1Id) && teamIds.includes(team2Id);
        });

        if (directMatches.length > 0) {
          let team1Wins = 0;
          let team2Wins = 0;

          directMatches.forEach(match => {
            if (match.winner_id === team1Id) team1Wins++;
            else if (match.winner_id === team2Id) team2Wins++;
          });

          setHeadToHead({
            team1_wins: team1Wins,
            team2_wins: team2Wins,
            total_matches: directMatches.length
          });
        }
      }
    } catch (error) {
      console.error('Error fetching head-to-head data:', error);
    }
  };

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 70) return 'text-green-500';
    if (winRate >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const compareMetric = (team1Value: number, team2Value: number, higherIsBetter = true) => {
    if (!team1Value || !team2Value) return { team1Better: false, team2Better: false };
    
    if (higherIsBetter) {
      return {
        team1Better: team1Value > team2Value,
        team2Better: team2Value > team1Value
      };
    } else {
      return {
        team1Better: team1Value < team2Value,
        team2Better: team2Value < team1Value
      };
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!team1Data && !team2Data) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Team comparison data not available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-center">
          <Users className="h-5 w-5 mr-2" />
          Team Analysis & Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="head-to-head">Head-to-Head</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Win Rate Comparison */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="text-center">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Team 1 Win Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getWinRateColor(team1Data?.recent_win_rate || 0)}`}>
                    {team1Data?.recent_win_rate ? `${team1Data.recent_win_rate.toFixed(1)}%` : 'N/A'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {team1Data?.recent_matches_count || 0} recent matches
                  </div>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Team 2 Win Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getWinRateColor(team2Data?.recent_win_rate || 0)}`}>
                    {team2Data?.recent_win_rate ? `${team2Data.recent_win_rate.toFixed(1)}%` : 'N/A'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {team2Data?.recent_matches_count || 0} recent matches
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Metrics */}
            <div className="space-y-3">
              <h4 className="font-medium">Performance Comparison</h4>
              
              {/* Eco Round Win Rate */}
              {(team1Data?.eco_round_win_rate || team2Data?.eco_round_win_rate) && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Eco Round Win Rate</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <span>Team 1</span>
                      <span className="font-medium">
                        {team1Data?.eco_round_win_rate ? `${(team1Data.eco_round_win_rate * 100).toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Team 2</span>
                      <span className="font-medium">
                        {team2Data?.eco_round_win_rate ? `${(team2Data.eco_round_win_rate * 100).toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Pistol Round Win Rate */}
              {(team1Data?.pistol_round_win_rate || team2Data?.pistol_round_win_rate) && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Pistol Round Win Rate</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <span>Team 1</span>
                      <span className="font-medium">
                        {team1Data?.pistol_round_win_rate ? `${(team1Data.pistol_round_win_rate * 100).toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Team 2</span>
                      <span className="font-medium">
                        {team2Data?.pistol_round_win_rate ? `${(team2Data.pistol_round_win_rate * 100).toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tournament Success */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Trophy className="h-4 w-4 mr-1" />
                    Major Wins
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between">
                    <span>Team 1: {team1Data?.major_wins || 0}</span>
                    <span>Team 2: {team2Data?.major_wins || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Prize Money</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="text-sm">
                      Team 1: ${(team1Data?.prize_money || 0).toLocaleString()}
                    </div>
                    <div className="text-sm">
                      Team 2: ${(team2Data?.prize_money || 0).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="head-to-head" className="space-y-4">
            {headToHead ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">Historical Matchup</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div className="grid grid-cols-3 gap-4 items-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{headToHead.team1_wins}</div>
                        <div className="text-sm text-muted-foreground">Team 1 Wins</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg text-muted-foreground">VS</div>
                        <div className="text-sm text-muted-foreground">{headToHead.total_matches} matches</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{headToHead.team2_wins}</div>
                        <div className="text-sm text-muted-foreground">Team 2 Wins</div>
                      </div>
                    </div>
                    
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(headToHead.team1_wins / headToHead.total_matches) * 100}%` 
                        }}
                      />
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Win Rate: {((headToHead.team1_wins / headToHead.total_matches) * 100).toFixed(1)}% vs {((headToHead.team2_wins / headToHead.total_matches) * 100).toFixed(1)}%
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No head-to-head data available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-4">
              <h4 className="font-medium">Map Statistics</h4>
              
              {(team1Data?.map_stats || team2Data?.map_stats) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Team 1 Map Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {team1Data?.map_stats ? (
                        <div className="space-y-2">
                          {Object.entries(team1Data.map_stats as Record<string, any>).map(([map, stats]) => (
                            <div key={map} className="flex justify-between">
                              <span className="capitalize">{map}</span>
                              <span className="font-medium">
                                {typeof stats === 'object' && stats.win_rate ? 
                                  `${(stats.win_rate * 100).toFixed(1)}%` : 
                                  'N/A'
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No map data available</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Team 2 Map Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {team2Data?.map_stats ? (
                        <div className="space-y-2">
                          {Object.entries(team2Data.map_stats as Record<string, any>).map(([map, stats]) => (
                            <div key={map} className="flex justify-between">
                              <span className="capitalize">{map}</span>
                              <span className="font-medium">
                                {typeof stats === 'object' && stats.win_rate ? 
                                  `${(stats.win_rate * 100).toFixed(1)}%` : 
                                  'N/A'
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No map data available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">Advanced statistics not available</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};