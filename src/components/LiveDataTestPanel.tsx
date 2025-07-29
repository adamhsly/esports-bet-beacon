import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Play, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const LiveDataTestPanel = () => {
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [liveStats, setLiveStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchLiveData = async () => {
    setIsLoading(true);
    try {
      // Fetch live matches
      const { data: matches, error: matchError } = await supabase
        .from('faceit_matches')
        .select('match_id, status, competition_name, teams, live_team_scores, last_live_update')
        .in('status', ['ongoing', 'live', 'LIVE', 'ONGOING'])
        .order('last_live_update', { ascending: false });

      if (matchError) throw matchError;

      // Fetch live stats
      const { data: stats, error: statsError } = await supabase
        .from('faceit_live_match_stats')
        .select('*')
        .order('updated_at', { ascending: false });

      if (statsError) throw statsError;

      setLiveMatches(matches || []);
      setLiveStats(stats || []);
    } catch (error) {
      console.error('Error fetching live data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch live data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const triggerLiveSync = async () => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-faceit-live', {
        body: { games: ['cs2', 'dota2'] }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Live sync triggered successfully",
      });

      // Refresh data after 2 seconds
      setTimeout(() => {
        fetchLiveData();
      }, 2000);
    } catch (error) {
      console.error('Error triggering sync:', error);
      toast({
        title: "Error",
        description: "Failed to trigger live sync",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const triggerMatchSync = async (matchId: string) => {
    try {
      const { error } = await supabase.functions.invoke('sync-faceit-live-match', {
        body: { matchId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Live sync triggered for match ${matchId}`,
      });

      // Refresh data after 1 second
      setTimeout(() => {
        fetchLiveData();
      }, 1000);
    } catch (error) {
      console.error('Error triggering match sync:', error);
      toast({
        title: "Error",
        description: "Failed to trigger match sync",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchLiveData();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('live-data-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'faceit_live_match_stats'
      }, () => {
        fetchLiveData();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'faceit_matches'
      }, () => {
        fetchLiveData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Live FACEIT Data Test Panel</h3>
          <div className="flex gap-2">
            <Button 
              onClick={fetchLiveData} 
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button 
              onClick={triggerLiveSync} 
              disabled={isSyncing}
              size="sm"
            >
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Trigger Sync
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Live Matches */}
          <div>
            <h4 className="font-semibold mb-2">Live Matches ({liveMatches.length})</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {liveMatches.map((match) => (
                <div key={match.match_id} className="p-3 bg-gray-100 rounded text-sm">
                  <div className="font-medium">{match.competition_name}</div>
                  <div className="text-xs text-gray-600">ID: {match.match_id}</div>
                  <div className="text-xs">Status: {match.status}</div>
                  {match.live_team_scores && (
                    <div className="text-xs">
                      Score: {match.live_team_scores.faction1 || 0} - {match.live_team_scores.faction2 || 0}
                    </div>
                  )}
                  <div className="text-xs">
                    Last Update: {match.last_live_update ? new Date(match.last_live_update).toLocaleTimeString() : 'Never'}
                  </div>
                  <Button 
                    onClick={() => triggerMatchSync(match.match_id)}
                    size="sm" 
                    variant="outline"
                    className="mt-2"
                  >
                    Sync This Match
                  </Button>
                </div>
              ))}
              {liveMatches.length === 0 && (
                <div className="text-gray-500 text-sm">No live matches found</div>
              )}
            </div>
          </div>

          {/* Live Stats */}
          <div>
            <h4 className="font-semibold mb-2">Live Stats ({liveStats.length})</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {liveStats.map((stat, index) => (
                <div key={`${stat.match_id}-${index}`} className="p-3 bg-gray-100 rounded text-sm">
                  <div className="font-medium">Match: {stat.match_id}</div>
                  <div className="text-xs">Round: {stat.round_number}</div>
                  <div className="text-xs">Phase: {stat.round_phase}</div>
                  {stat.team_scores && (
                    <div className="text-xs">
                      Scores: {JSON.stringify(stat.team_scores)}
                    </div>
                  )}
                  <div className="text-xs">
                    Updated: {new Date(stat.updated_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {liveStats.length === 0 && (
                <div className="text-gray-500 text-sm">No live stats found</div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LiveDataTestPanel;