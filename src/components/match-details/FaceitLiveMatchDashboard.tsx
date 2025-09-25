import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Timer, Target, Crosshair, Users, TrendingUp, Activity, Skull, Heart, Shield, DollarSign, Bomb, Play, Pause, RefreshCw } from 'lucide-react';
interface LiveMatchData {
  matchId: string;
  currentRound: number;
  roundTimer: number;
  matchPhase: 'warmup' | 'live' | 'halftime' | 'overtime' | 'finished';
  teamScores: {
    faction1: number;
    faction2: number;
  };
  playerStatus: Record<string, {
    alive: boolean;
    health: number;
    armor: number;
    money: number;
    weapon: string;
    kills: number;
    deaths: number;
    assists: number;
  }>;
  killFeed: Array<{
    id: string;
    killer: string;
    victim: string;
    weapon: string;
    headshot: boolean;
    timestamp: string;
  }>;
  bombStatus: 'planted' | 'defused' | 'exploded' | 'none';
  bombTimer?: number;
  autoRefreshInterval: number;
}
interface FaceitLiveMatchDashboardProps {
  matchData: LiveMatchData;
  teams: Array<{
    name: string;
    logo?: string;
    faction: 'faction1' | 'faction2';
    roster?: Array<{
      nickname: string;
      player_id: string;
      avatar?: string;
    }>;
  }>;
  onRefresh?: () => void;
}
export const FaceitLiveMatchDashboard: React.FC<FaceitLiveMatchDashboardProps> = ({
  matchData,
  teams,
  onRefresh
}) => {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(matchData.autoRefreshInterval / 1000);

  // Auto-refresh countdown
  useEffect(() => {
    if (!autoRefresh || matchData.matchPhase === 'finished') return;
    const interval = setInterval(() => {
      setTimeUntilRefresh(prev => {
        if (prev <= 1) {
          onRefresh?.();
          return matchData.autoRefreshInterval / 1000;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, matchData.autoRefreshInterval, matchData.matchPhase, onRefresh]);
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'warmup':
        return 'bg-blue-500/20 text-blue-400 border-blue-400/30';
      case 'live':
        return 'bg-green-500/20 text-green-400 border-green-400/30';
      case 'halftime':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30';
      case 'overtime':
        return 'bg-orange-500/20 text-orange-400 border-orange-400/30';
      case 'finished':
        return 'bg-gray-500/20 text-gray-400 border-gray-400/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-400/30';
    }
  };
  const renderMatchOverview = () => (
    <Card className="bg-theme-gray-dark border-theme-gray-medium">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Live Match Overview</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getPhaseColor(matchData.matchPhase)}>
              {matchData.matchPhase.toUpperCase()}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="text-xs"
            >
              {autoRefresh ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-theme-purple">
              {matchData.teamScores.faction1}
            </div>
            <div className="text-sm text-gray-400">{teams[0]?.name || 'Team 1'}</div>
          </div>
          <div>
            <div className="text-lg text-gray-400">Round {matchData.currentRound}</div>
            <div className="text-sm text-gray-400">{formatTime(matchData.roundTimer)}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-theme-purple">
              {matchData.teamScores.faction2}
            </div>
            <div className="text-sm text-gray-400">{teams[1]?.name || 'Team 2'}</div>
          </div>
        </div>
      </div>
    </Card>
  );

  const renderPlayerPerformance = () => (
    <Card className="bg-theme-gray-dark border-theme-gray-medium">
      <div className="p-6">
        <h3 className="text-lg font-bold text-white mb-4">Player Performance</h3>
        <div className="space-y-4">
          {teams.map(team => (
            <div key={team.faction} className="space-y-2">
              <h4 className="font-semibold text-white border-b border-theme-gray-medium pb-2">
                {team.name}
              </h4>
              {team.roster?.map(player => {
                const status = matchData.playerStatus[player.player_id];
                if (!status) return null;
                return (
                  <div key={player.player_id} className="flex items-center justify-between p-2 bg-theme-gray-medium/30 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-white">{player.nickname}</span>
                      {status.alive ? <Heart className="h-3 w-3 text-green-400" /> : <Skull className="h-3 w-3 text-red-400" />}
                    </div>
                    <div className="text-sm text-gray-400">
                      {status.kills}/{status.deaths}/{status.assists}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
  const renderPlayerStatus = () => <Card className="bg-theme-gray-dark border-theme-gray-medium">
      <div className="p-6">
        <h3 className="text-lg font-bold text-white mb-4">Live Player Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teams.map(team => <div key={team.faction} className="space-y-3">
              <h4 className="font-semibold text-white border-b border-theme-gray-medium pb-2">
                {team.name}
              </h4>
              
              {team.roster?.map(player => {
            const status = matchData.playerStatus[player.player_id];
            if (!status) return null;
            return <div key={player.player_id} className="bg-theme-gray-medium/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <img src={player.avatar || '/placeholder.svg'} alt={player.nickname} className="w-6 h-6 rounded-full object-cover" />
                        <span className="font-semibold text-white">{player.nickname}</span>
                        {status.alive ? <Heart className="h-4 w-4 text-green-400" /> : <Skull className="h-4 w-4 text-red-400" />}
                      </div>
                      <span className="text-sm text-gray-400">{status.weapon}</span>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3 text-red-400" />
                        <span className="text-white">{status.health}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3 text-blue-400" />
                        <span className="text-white">{status.armor}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-green-400" />
                        <span className="text-white">${status.money}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3 text-orange-400" />
                        <span className="text-white">{status.kills}/{status.deaths}/{status.assists}</span>
                      </div>
                    </div>
                  </div>;
          })}
            </div>)}
        </div>
      </div>
    </Card>;
  const renderKillFeed = () => <Card className="bg-theme-gray-dark border-theme-gray-medium">
      <div className="p-6">
        <h3 className="text-lg font-bold text-white mb-4">Live Kill Feed</h3>
        
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {matchData.killFeed.slice(-10).reverse().map(kill => <div key={kill.id} className="flex items-center justify-between p-2 bg-theme-gray-medium/50 rounded">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{kill.killer}</span>
                <Crosshair className={`h-4 w-4 ${kill.headshot ? 'text-red-400' : 'text-gray-400'}`} />
                <span className="text-gray-400">{kill.victim}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{kill.weapon}</span>
                <span>{new Date(kill.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>)}
        </div>
      </div>
    </Card>;
  return (
    <div className="space-y-6">
      {renderMatchOverview()}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderPlayerPerformance()}
        {renderKillFeed()}
      </div>
    </div>
  );
};