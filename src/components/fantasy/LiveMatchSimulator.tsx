
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  team: string;
}

interface LiveMatchSimulatorProps {
  sessionId: string;
}

export const LiveMatchSimulator: React.FC<LiveMatchSimulatorProps> = ({ sessionId }) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [players, setPlayers] = useState<Player[]>([
    { id: 'p1', name: 's1mple', team: 'NAVI' },
    { id: 'p2', name: 'ZywOo', team: 'Vitality' },
    { id: 'p3', name: 'sh1ro', team: 'Cloud9' },
    { id: 'p4', name: 'device', team: 'Astralis' },
    { id: 'p5', name: 'NiKo', team: 'G2' },
    { id: 'p6', name: 'Ax1Le', team: 'Cloud9' },
    { id: 'p7', name: 'apEX', team: 'Vitality' },
    { id: 'p8', name: 'gla1ve', team: 'Astralis' },
    { id: 'p9', name: 'electroNic', team: 'NAVI' },
    { id: 'p10', name: 'huNter-', team: 'G2' }
  ]);
  const [updateInterval, setUpdateInterval] = useState(5000);
  const { toast } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isSimulating) {
      interval = setInterval(() => {
        simulatePlayerUpdate();
      }, updateInterval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isSimulating, updateInterval, sessionId]);

  const simulatePlayerUpdate = async () => {
    try {
      // Pick a random player to update
      const randomPlayer = players[Math.floor(Math.random() * players.length)];
      
      // Generate random performance data
      const performanceUpdate = {
        current_kills: Math.floor(Math.random() * 3), // 0-2 new kills
        current_deaths: Math.random() > 0.7 ? 1 : 0, // 30% chance of death
        current_assists: Math.floor(Math.random() * 2), // 0-1 new assists
        current_adr: Math.random() * 30 + 50, // 50-80 ADR
        mvp_rounds: Math.random() > 0.8 ? 1 : 0, // 20% chance of MVP
        clutch_rounds: Math.random() > 0.9 ? 1 : 0, // 10% chance of clutch
      };

      // Check if player already exists in this session
      const { data: existingPlayer } = await supabase
        .from('live_player_performance')
        .select('*')
        .eq('session_id', sessionId)
        .eq('player_id', randomPlayer.id)
        .single();

      let newStats;
      if (existingPlayer) {
        // Update existing player stats
        newStats = {
          current_kills: existingPlayer.current_kills + performanceUpdate.current_kills,
          current_deaths: existingPlayer.current_deaths + performanceUpdate.current_deaths,
          current_assists: existingPlayer.current_assists + performanceUpdate.current_assists,
          current_adr: ((existingPlayer.current_adr + performanceUpdate.current_adr) / 2),
          mvp_rounds: existingPlayer.mvp_rounds + performanceUpdate.mvp_rounds,
          clutch_rounds: existingPlayer.clutch_rounds + performanceUpdate.clutch_rounds,
        };

        // Calculate fantasy points using the database function
        const { data: pointsData } = await supabase.rpc('calculate_fantasy_points', {
          kills: newStats.current_kills,
          deaths: newStats.current_deaths,
          assists: newStats.current_assists,
          adr: newStats.current_adr,
          mvp_rounds: newStats.mvp_rounds,
          clutch_rounds: newStats.clutch_rounds,
          scoring_config: {
            kills: 2,
            deaths: -1,
            assists: 1,
            adr_multiplier: 0.1,
            mvp_bonus: 5,
            clutch_bonus: 3
          }
        });

        const { error } = await supabase
          .from('live_player_performance')
          .update({
            ...newStats,
            fantasy_points: pointsData || 0,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingPlayer.id);

        if (error) throw error;
      } else {
        // Create new player entry
        const { data: pointsData } = await supabase.rpc('calculate_fantasy_points', {
          kills: performanceUpdate.current_kills,
          deaths: performanceUpdate.current_deaths,
          assists: performanceUpdate.current_assists,
          adr: performanceUpdate.current_adr,
          mvp_rounds: performanceUpdate.mvp_rounds,
          clutch_rounds: performanceUpdate.clutch_rounds,
          scoring_config: {
            kills: 2,
            deaths: -1,
            assists: 1,
            adr_multiplier: 0.1,
            mvp_bonus: 5,
            clutch_bonus: 3
          }
        });

        const { error } = await supabase
          .from('live_player_performance')
          .insert({
            session_id: sessionId,
            player_id: randomPlayer.id,
            player_name: randomPlayer.name,
            team_name: randomPlayer.team,
            ...performanceUpdate,
            fantasy_points: pointsData || 0,
          });

        if (error) throw error;
      }

      console.log(`Updated ${randomPlayer.name} with new performance data`);
    } catch (error) {
      console.error('Error simulating player update:', error);
    }
  };

  const startSimulation = () => {
    setIsSimulating(true);
    toast({
      title: "Simulation Started",
      description: "Live match simulation is now running",
    });
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    toast({
      title: "Simulation Stopped",
      description: "Live match simulation has been paused",
    });
  };

  const resetSimulation = async () => {
    try {
      const { error } = await supabase
        .from('live_player_performance')
        .delete()
        .eq('session_id', sessionId);

      if (error) throw error;

      toast({
        title: "Simulation Reset",
        description: "All player data has been cleared",
      });
    } catch (error) {
      console.error('Error resetting simulation:', error);
      toast({
        title: "Error",
        description: "Failed to reset simulation",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Match Simulator
          <Badge variant={isSimulating ? "default" : "secondary"}>
            {isSimulating ? "Running" : "Stopped"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={isSimulating ? stopSimulation : startSimulation}
            variant={isSimulating ? "destructive" : "default"}
            className="flex items-center gap-2"
          >
            {isSimulating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isSimulating ? "Stop" : "Start"} Simulation
          </Button>

          <Button
            onClick={resetSimulation}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="interval">Update Interval (ms)</Label>
            <Input
              id="interval"
              type="number"
              value={updateInterval}
              onChange={(e) => setUpdateInterval(parseInt(e.target.value))}
              min={1000}
              max={30000}
              step={1000}
            />
          </div>

          <div>
            <Label>Active Players</Label>
            <div className="text-sm text-gray-500 mt-1">
              {players.length} players in simulation
            </div>
          </div>
        </div>

        <div className="bg-theme-gray-medium p-4 rounded-lg">
          <h4 className="font-semibold mb-2">How it works:</h4>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Randomly selects players and generates performance updates</li>
            <li>• Calculates fantasy points based on scoring rules</li>
            <li>• Updates live leaderboards in real-time</li>
            <li>• Simulates realistic CS2 match scenarios</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
