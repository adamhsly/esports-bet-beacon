
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const PandaScoreSyncButtons = () => {
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  const handleSync = async (syncType: string, functionName: string) => {
    setSyncing(prev => ({ ...prev, [syncType]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke(functionName);
      
      if (error) {
        console.error(`${syncType} sync error:`, error);
        toast.error(`${syncType} sync failed: ${error.message}`);
      } else {
        console.log(`${syncType} sync result:`, data);
        toast.success(`${syncType} sync completed: ${data.processed} processed, ${data.added} added, ${data.updated} updated`);
      }
    } catch (error) {
      console.error(`${syncType} sync error:`, error);
      toast.error(`${syncType} sync failed`);
    } finally {
      setSyncing(prev => ({ ...prev, [syncType]: false }));
    }
  };

  const handleSetupCron = async () => {
    setSyncing(prev => ({ ...prev, cron: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('setup-pandascore-cron');
      
      if (error) {
        console.error('Cron setup error:', error);
        toast.error(`Cron setup failed: ${error.message}`);
      } else {
        console.log('Cron setup result:', data);
        toast.success('PandaScore cron jobs configured successfully');
      }
    } catch (error) {
      console.error('Cron setup error:', error);
      toast.error('Cron setup failed');
    } finally {
      setSyncing(prev => ({ ...prev, cron: false }));
    }
  };

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">PandaScore Sync Controls</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => handleSync('Upcoming Matches', 'sync-pandascore-upcoming-matches')}
            disabled={syncing['matches']}
            variant="outline"
            size="sm"
          >
            {syncing['matches'] ? 'Syncing...' : 'Sync Upcoming Matches'}
          </Button>
          
          <Button
            onClick={() => handleSync('Teams', 'sync-pandascore-teams')}
            disabled={syncing['teams']}
            variant="outline"
            size="sm"
          >
            {syncing['teams'] ? 'Syncing...' : 'Sync Teams'}
          </Button>
          
          <Button
            onClick={() => handleSync('Tournaments', 'sync-pandascore-tournaments')}
            disabled={syncing['tournaments']}
            variant="outline"
            size="sm"
          >
            {syncing['tournaments'] ? 'Syncing...' : 'Sync Tournaments'}
          </Button>
          
          <Button
            onClick={handleSetupCron}
            disabled={syncing['cron']}
            variant="default"
            size="sm"
          >
            {syncing['cron'] ? 'Setting up...' : 'Setup Cron Jobs'}
          </Button>
        </div>
      </div>
    </div>
  );
};
