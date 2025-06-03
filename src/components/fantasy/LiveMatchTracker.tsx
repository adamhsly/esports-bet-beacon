import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LiveLeaderboard } from './LiveLeaderboard';
import { LiveMatchSimulator } from './LiveMatchSimulator';
import { Play, Pause, Square, Zap, Target, TrendingUp, Settings } from 'lucide-react';

interface LiveSession {
  id: string;
  tournament_id: string;
  match_id: string;
  session_start: string;
  session_end: string | null;
  status: string;
  scoring_config: any;
}

interface PlayerPerformance {
  id: string;
  player_name: string;
  team_name: string;
  current_kills: number;
  current_deaths: number;
  current_assists: number;
  current_adr: number;
  mvp_rounds: number;
  clutch_rounds: number;
  fantasy_points: number;
  last_updated: string;
}

interface LiveMatchTrackerProps {
  tournamentId: string;
}

interface RealtimePayload {
  new?: {
    session_id?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export const LiveMatchTracker: React.FC<LiveMatchTrackerProps> = ({ tournamentId }) => {
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null);
  const [playerPerformances, setPlayerPerformances] = useState<PlayerPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLiveSessions();
    setupRealtimeSubscriptions();
  }, [tournamentId]);

  useEffect(() => {
    if (selectedSession) {
      fetchPlayerPerformances(selectedSession.id);
    }
  }, [selectedSession]);

  const fetchLiveSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('fantasy_live_sessions')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLiveSessions(data || []);
      if (data && data.length > 0) {
        setSelectedSession(data[0]);
      }
    } catch (error) {
      console.error('Error fetching live sessions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch live sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerPerformances = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('live_player_performance')
        .select('*')
        .eq('session_id', sessionId)
        .order('fantasy_points', { ascending: false });

      if (error) throw error;

      setPlayerPerformances(data || []);
    } catch (error) {
      console.error('Error fetching player performances:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const channel = supabase
      .channel('live-match-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_player_performance'
        },
        (payload: RealtimePayload) => {
          console.log('Real-time player performance update:', payload);
          if (selectedSession && payload.new?.session_id === selectedSession.id) {
            fetchPlayerPerformances(selectedSession.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fantasy_live_sessions'
        },
        (payload: RealtimePayload) => {
          console.log('Real-time session update:', payload);
          fetchLiveSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const startLiveSession = async (matchId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // For demo purposes, we'll allow this without authentication
        console.log('No user authenticated, creating demo session');
      }

      const { data, error } = await supabase
        .from('fantasy_live_sessions')
        .insert({
          tournament_id: tournamentId,
          match_id: matchId,
          status: 'active',
          scoring_config: {
            kills: 2,
            deaths: -1,
            assists: 1,
            adr_multiplier: 0.1,
            mvp_bonus: 5,
            clutch_bonus: 3
          }
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Live session started successfully",
      });

      fetchLiveSessions();
    } catch (error) {
      console.error('Error starting live session:', error);
      toast({
        title: "Error",
        description: "Failed to start live session",
        variant: "destructive",
      });
    }
  };

  const endLiveSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('fantasy_live_sessions')
        .update({
          status: 'completed',
          session_end: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Live session ended successfully",
      });

      fetchLiveSessions();
    } catch (error) {
      console.error('Error ending live session:', error);
      toast({
        title: "Error",
        description: "Failed to end live session",
        variant: "destructive",
      });
    }
  };

  const getKDRatio = (kills: number, deaths: number) => {
    return deaths === 0 ? kills.toFixed(2) : (kills / deaths).toFixed(2);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-purple"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live Session Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Live Match Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={() => startLiveSession('demo-match-' + Date.now())}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Start Demo Session
            </Button>
            
            {selectedSession && selectedSession.status === 'active' && (
              <Button
                onClick={() => endLiveSession(selectedSession.id)}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                End Session
              </Button>
            )}
          </div>

          {liveSessions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {liveSessions.map(session => (
                <Button
                  key={session.id}
                  variant={selectedSession?.id === session.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSession(session)}
                >
                  Match {session.match_id.split('-').pop()}
                  <Badge className="ml-2" variant={session.status === 'active' ? 'default' : 'secondary'}>
                    {session.status}
                  </Badge>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Session Content */}
      {selectedSession && (
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Player Performance
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Live Leaderboard
            </TabsTrigger>
            <TabsTrigger value="simulator" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Simulator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Live Player Performance
                  <Badge variant={selectedSession.status === 'active' ? 'default' : 'secondary'}>
                    {selectedSession.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {playerPerformances.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No player performance data yet. Use the simulator to generate demo data!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {playerPerformances.map((player) => (
                      <div
                        key={player.id}
                        className="bg-theme-gray-dark rounded-lg p-4 border border-theme-gray-medium"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-lg">{player.player_name}</h4>
                            <p className="text-sm text-gray-400">{player.team_name}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-theme-purple">
                              {player.fantasy_points.toFixed(1)} pts
                            </div>
                            <div className="text-sm text-gray-400">
                              K/D: {getKDRatio(player.current_kills, player.current_deaths)}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-semibold text-green-400">{player.current_kills}</div>
                            <div className="text-gray-500">Kills</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-red-400">{player.current_deaths}</div>
                            <div className="text-gray-500">Deaths</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-blue-400">{player.current_assists}</div>
                            <div className="text-gray-500">Assists</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold">{player.current_adr.toFixed(1)}</div>
                            <div className="text-gray-500">ADR</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-yellow-400">{player.mvp_rounds}</div>
                            <div className="text-gray-500">MVP</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-purple-400">{player.clutch_rounds}</div>
                            <div className="text-gray-500">Clutch</div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Fantasy Points Progress</span>
                            <span>{player.fantasy_points.toFixed(1)} / 100</span>
                          </div>
                          <Progress 
                            value={Math.min((player.fantasy_points / 100) * 100, 100)} 
                            className="h-2" 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard">
            <LiveLeaderboard sessionId={selectedSession.id} tournamentId={tournamentId} />
          </TabsContent>

          <TabsContent value="simulator">
            <LiveMatchSimulator sessionId={selectedSession.id} />
          </TabsContent>
        </Tabs>
      )}

      {!selectedSession && liveSessions.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Zap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-4">No Live Sessions</h3>
            <p className="text-gray-500 mb-6">
              Start a demo session to see live match tracking in action!
            </p>
            <Button
              onClick={() => startLiveSession('demo-match-' + Date.now())}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Start Demo Session
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
