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
      const {
        data: matches,
        error: matchError
      } = await supabase.from('faceit_matches').select('match_id, status, competition_name, teams, live_team_scores, last_live_update').in('status', ['ongoing', 'live', 'LIVE', 'ONGOING']).order('last_live_update', {
        ascending: false
      });
      if (matchError) throw matchError;

      // Fetch live stats
      const {
        data: stats,
        error: statsError
      } = await supabase.from('faceit_live_match_stats').select('*').order('updated_at', {
        ascending: false
      });
      if (statsError) throw statsError;
      setLiveMatches(matches || []);
      setLiveStats(stats || []);
    } catch (error) {
      console.error('Error fetching live data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch live data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const triggerLiveSync = async () => {
    setIsSyncing(true);
    try {
      const {
        error
      } = await supabase.functions.invoke('sync-faceit-live', {
        body: {
          games: ['cs2', 'dota2']
        }
      });
      if (error) throw error;
      toast({
        title: "Success",
        description: "Live sync triggered successfully"
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
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };
  const triggerMatchSync = async (matchId: string) => {
    try {
      const {
        error
      } = await supabase.functions.invoke('sync-faceit-live-match', {
        body: {
          matchId
        }
      });
      if (error) throw error;
      toast({
        title: "Success",
        description: `Live sync triggered for match ${matchId}`
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
        variant: "destructive"
      });
    }
  };
  useEffect(() => {
    fetchLiveData();
    
    // Use polling instead of realtime for test panel to reduce connections
    const interval = setInterval(fetchLiveData, 30000); // 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, []);
  return <div className="space-y-4">
      
    </div>;
};
export default LiveDataTestPanel;