import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  Play, 
  RefreshCw, 
  Settings, 
  Activity,
  CheckCircle,
  AlertCircle,
  Timer
} from 'lucide-react';
import { useMatchStatusUpdater } from '@/hooks/useMatchStatusUpdater';

export const MatchStatusManager: React.FC = () => {
  const { 
    isUpdating, 
    lastUpdate, 
    triggerStatusUpdate, 
    setupCronJob, 
    syncLiveMatch 
  } = useMatchStatusUpdater();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [testMatchId, setTestMatchId] = useState('');

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ongoing':
      case 'running':
      case 'live':
        return 'bg-green-500/20 text-green-400 border-green-400/30';
      case 'finished':
      case 'completed':
        return 'bg-gray-500/20 text-gray-400 border-gray-400/30';
      case 'upcoming':
      case 'not_started':
      case 'scheduled':
        return 'bg-blue-500/20 text-blue-400 border-blue-400/30';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30';
    }
  };

  const renderStatusSummary = () => (
    <Card className="bg-theme-gray-dark border-theme-gray-medium">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Status Update System</h3>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="h-4 w-4" />
            {formatTime(currentTime)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-3">
            <Button 
              onClick={triggerStatusUpdate}
              disabled={isUpdating}
              className="w-full"
              size="sm"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Manual Update
                </>
              )}
            </Button>

            <Button 
              onClick={setupCronJob}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Setup Auto Updates
            </Button>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-gray-400">Last Update:</div>
            {lastUpdate ? (
              <div className="space-y-1">
                <div className="text-xs text-green-400">
                  {new Date(lastUpdate.timestamp).toLocaleString()}
                </div>
                <div className="text-xs text-gray-300">
                  {lastUpdate.totalUpdates} matches updated
                </div>
                <div className="text-xs text-orange-400">
                  {lastUpdate.newLiveMatches} went live
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">No updates yet</div>
            )}
          </div>
        </div>

        {lastUpdate && lastUpdate.updates.length > 0 && (
          <div>
            <h4 className="font-semibold text-white mb-2">Recent Updates:</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {lastUpdate.updates.slice(0, 10).map((update, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-theme-gray-medium/50 rounded text-sm">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className="text-xs"
                    >
                      {update.provider}
                    </Badge>
                    <span className="text-gray-300 font-mono">
                      {update.matchId.slice(-8)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getStatusColor(update.oldStatus)}>
                      {update.oldStatus}
                    </Badge>
                    <span className="text-gray-400">→</span>
                    <Badge variant="outline" className={getStatusColor(update.newStatus)}>
                      {update.newStatus}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );

  const renderLiveMatchSync = () => (
    <Card className="bg-theme-gray-dark border-theme-gray-medium">
      <div className="p-6">
        <h3 className="text-lg font-bold text-white mb-4">Live Match Sync</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Match ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testMatchId}
                onChange={(e) => setTestMatchId(e.target.value)}
                placeholder="Enter FACEIT match ID..."
                className="flex-1 bg-theme-gray-medium border border-theme-gray-light rounded px-3 py-2 text-white text-sm"
              />
              <Button
                onClick={() => syncLiveMatch(testMatchId)}
                disabled={!testMatchId.trim()}
                size="sm"
              >
                <Activity className="h-4 w-4 mr-2" />
                Sync
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Manually sync live data for a specific FACEIT match
            </p>
          </div>
        </div>
      </div>
    </Card>
  );

  const renderSystemInfo = () => (
    <Card className="bg-theme-gray-dark border-theme-gray-medium">
      <div className="p-6">
        <h3 className="text-lg font-bold text-white mb-4">System Information</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-white">Auto Update Frequency</span>
              </div>
              <p className="text-xs text-gray-400">Every 2 minutes</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-white">Status Transitions</span>
              </div>
              <p className="text-xs text-gray-400">Upcoming → Live → Finished</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-400" />
                <span className="text-sm font-medium text-white">FACEIT Statuses</span>
              </div>
              <p className="text-xs text-gray-400">READY → ONGOING → FINISHED</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-white">PandaScore Statuses</span>
              </div>
              <p className="text-xs text-gray-400">not_started → running → finished</p>
            </div>
          </div>

          <div className="pt-4 border-t border-theme-gray-medium">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">Auto-Finish Logic</p>
                <p className="text-xs text-gray-400 mt-1">
                  FACEIT matches auto-finish after 3 hours with no updates.
                  PandaScore matches auto-finish after 4 hours with no sync.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Activity className="h-6 w-6 text-orange-400" />
        <h2 className="text-2xl font-bold text-white">Match Status Manager</h2>
      </div>

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="status">Status Updates</TabsTrigger>
          <TabsTrigger value="sync">Live Sync</TabsTrigger>
          <TabsTrigger value="info">System Info</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          {renderStatusSummary()}
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          {renderLiveMatchSync()}
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          {renderSystemInfo()}
        </TabsContent>
      </Tabs>
    </div>
  );
};