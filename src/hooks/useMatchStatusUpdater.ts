import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface MatchStatusUpdate {
  matchId: string;
  provider: 'faceit' | 'pandascore';
  oldStatus: string;
  newStatus: string;
  reason: string;
}

export interface StatusUpdateSummary {
  timestamp: string;
  totalUpdates: number;
  faceitUpdates: number;
  pandascoreUpdates: number;
  newLiveMatches: number;
  updates: MatchStatusUpdate[];
}

export function useMatchStatusUpdater() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<StatusUpdateSummary | null>(null);

  const triggerStatusUpdate = async (): Promise<StatusUpdateSummary | null> => {
    setIsUpdating(true);
    
    try {
      console.log('🔄 Triggering match status update...');
      
      const { data, error } = await supabase.functions.invoke('auto-match-status-updater', {
        body: { manual: true }
      });

      if (error) {
        console.error('❌ Error triggering status update:', error);
        toast({
          title: "Status Update Failed",
          description: "Failed to update match statuses. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      if (data && data.success) {
        const summary = data.summary as StatusUpdateSummary;
        setLastUpdate(summary);
        
        if (summary.totalUpdates > 0) {
          toast({
            title: "Match Statuses Updated",
            description: `Successfully updated ${summary.totalUpdates} matches (${summary.newLiveMatches} now live)`,
          });
        } else {
          toast({
            title: "No Updates Needed",
            description: "All match statuses are already up to date.",
          });
        }
        
        return summary;
      } else {
        throw new Error(data?.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('❌ Error in triggerStatusUpdate:', error);
      toast({
        title: "Update Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUpdating(false);
    }
  };

  const setupCronJob = async (): Promise<boolean> => {
    try {
      console.log('⚙️ Setting up cron job for automatic status updates...');
      
      const { data, error } = await supabase.functions.invoke('setup-match-status-cron', {
        body: {}
      });

      if (error) {
        console.error('❌ Error setting up cron job:', error);
        toast({
          title: "Cron Setup Failed",
          description: "Failed to set up automatic status updates.",
          variant: "destructive",
        });
        return false;
      }

      if (data && data.success) {
        toast({
          title: "Automation Enabled",
          description: "Match status updates will now run automatically every 2 minutes.",
        });
        return true;
      } else {
        throw new Error(data?.error || 'Failed to set up cron job');
      }
    } catch (error) {
      console.error('❌ Error in setupCronJob:', error);
      toast({
        title: "Setup Error",
        description: error instanceof Error ? error.message : "Failed to enable automation",
        variant: "destructive",
      });
      return false;
    }
  };

  const syncLiveMatch = async (matchId: string): Promise<boolean> => {
    try {
      console.log(`🎮 Syncing live data for match: ${matchId}`);
      
      const { data, error } = await supabase.functions.invoke('sync-faceit-live-match', {
        body: { matchId }
      });

      if (error) {
        console.error('❌ Error syncing live match:', error);
        toast({
          title: "Live Sync Failed",
          description: `Failed to sync live data for match ${matchId}`,
          variant: "destructive",
        });
        return false;
      }

      if (data && data.success) {
        toast({
          title: "Live Data Synced",
          description: `Successfully updated live data for match ${matchId}`,
        });
        return true;
      } else {
        throw new Error(data?.error || 'Live sync failed');
      }
    } catch (error) {
      console.error('❌ Error in syncLiveMatch:', error);
      toast({
        title: "Sync Error",
        description: error instanceof Error ? error.message : "Live sync failed",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    isUpdating,
    lastUpdate,
    triggerStatusUpdate,
    setupCronJob,
    syncLiveMatch
  };
}