
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Users, AlertCircle } from 'lucide-react';

export const PandaScoreSyncButtons = () => {
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  const handleSync = async (syncType: string, functionName: string) => {
    setSyncing(prev => ({ ...prev, [syncType]: true }));
    
    try {
      console.log(`🔄 Starting ${syncType} sync...`);
      
      const { data, error } = await supabase.functions.invoke(functionName);
      
      if (error) {
        console.error(`${syncType} sync error:`, error);
        toast.error(`${syncType} sync failed: ${error.message}`);
      } else {
        console.log(`${syncType} sync result:`, data);
        if (data.success) {
          toast.success(`${syncType} sync completed: ${data.processed} processed, ${data.added} added, ${data.updated} updated`);
        } else {
          toast.error(`${syncType} sync failed: ${data.error || 'Unknown error'}`);
        }
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

  const checkMatchCount = async () => {
    try {
      const { data, error } = await supabase
        .from('pandascore_matches')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error('Error checking match count:', error);
        toast.error('Failed to check match count');
      } else {
        toast.info(`PandaScore matches in database: ${data?.length || 0}`);
      }
    } catch (error) {
      console.error('Error checking match count:', error);
      toast.error('Failed to check match count');
    }
  };

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold flex items-center">
          <Users className="h-5 w-5 mr-2" />
          PandaScore Sync Controls
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => handleSync('All Matches (CS:GO + Others)', 'sync-pandascore-matches')}
            disabled={syncing['matches']}
            variant="outline"
            size="sm"
          >
            {syncing['matches'] ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              'Sync All Matches + Players'
            )}
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
            onClick={checkMatchCount}
            variant="secondary"
            size="sm"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Check DB Count
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
        
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
          💡 Updated sync now fetches CS:GO (not cs2) + other games with improved player data handling
        </p>
        <p className="text-xs text-red-600 dark:text-red-400">
          ⚠️ If you see 403 errors, the API key may need different permissions for player stats
        </p>
      </div>
    </div>
  );
};
