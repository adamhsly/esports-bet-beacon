
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const SportDevsSyncButtons = () => {
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  const handleSync = async (syncType: string, functionName: string) => {
    setSyncing(prev => ({ ...prev, [syncType]: true }));
    
    try {
      console.log(`🚀 Starting ${syncType} sync...`);
      const { data, error } = await supabase.functions.invoke(functionName);
      
      if (error) {
        console.error(`${syncType} sync error:`, error);
        if (error.message?.includes('SPORTDEVS_API_KEY')) {
          toast.error(`${syncType} sync failed: SportDevs API key not configured. Please check your API key in Supabase secrets.`);
        } else if (error.message?.includes('Unauthorized')) {
          toast.error(`${syncType} sync failed: Invalid API key. Please verify your SportDevs API key.`);
        } else {
          toast.error(`${syncType} sync failed: ${error.message}`);
        }
      } else {
        console.log(`${syncType} sync result:`, data);
        if (data?.success) {
          if (data.processed === 0) {
            toast.info(`${syncType} sync completed: No matches found. This may be normal if no live matches are currently available.`);
          } else {
            toast.success(`${syncType} sync completed: ${data.processed} processed, ${data.added} added, ${data.updated} updated`);
          }
        } else {
          toast.error(`${syncType} sync failed: ${data?.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error(`${syncType} sync error:`, error);
      toast.error(`${syncType} sync failed: ${error.message || 'Network error'}`);
    } finally {
      setSyncing(prev => ({ ...prev, [syncType]: false }));
    }
  };

  const handleSetupCron = async () => {
    setSyncing(prev => ({ ...prev, cron: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('setup-sportdevs-cron');
      
      if (error) {
        console.error('Cron setup error:', error);
        toast.error(`Cron setup failed: ${error.message}`);
      } else {
        console.log('Cron setup result:', data);
        toast.success('SportDevs cron jobs configured successfully');
      }
    } catch (error) {
      console.error('Cron setup error:', error);
      toast.error('Cron setup failed');
    } finally {
      setSyncing(prev => ({ ...prev, cron: false }));
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() => handleSync('Live Matches', 'sync-sportdevs-live')}
        disabled={syncing['live']}
        variant="outline"
        size="sm"
        className="text-red-400 border-red-400/30 hover:bg-red-500/20"
      >
        {syncing['live'] ? 'Syncing...' : 'Sync Live Pro'}
      </Button>
      
      <Button
        onClick={() => handleSync('Upcoming Matches', 'sync-sportdevs-upcoming-matches')}
        disabled={syncing['upcoming']}
        variant="outline"
        size="sm"
        className="text-blue-400 border-blue-400/30 hover:bg-blue-500/20"
      >
        {syncing['upcoming'] ? 'Syncing...' : 'Sync Upcoming Pro'}
      </Button>
      
      <Button
        onClick={() => handleSync('Teams', 'sync-sportdevs-teams')}
        disabled={syncing['teams']}
        variant="outline"
        size="sm"
        className="text-green-400 border-green-400/30 hover:bg-green-500/20"
      >
        {syncing['teams'] ? 'Syncing...' : 'Sync Teams'}
      </Button>
      
      <Button
        onClick={() => handleSync('Tournaments', 'sync-sportdevs-tournaments')}
        disabled={syncing['tournaments']}
        variant="outline"
        size="sm"
        className="text-purple-400 border-purple-400/30 hover:bg-purple-500/20"
      >
        {syncing['tournaments'] ? 'Syncing...' : 'Sync Tournaments'}
      </Button>
      
      <Button
        onClick={handleSetupCron}
        disabled={syncing['cron']}
        variant="default"
        size="sm"
        className="bg-theme-purple hover:bg-theme-purple/90"
      >
        {syncing['cron'] ? 'Setting up...' : 'Setup Cron Jobs'}
      </Button>
    </div>
  );
};
