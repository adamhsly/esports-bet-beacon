
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Users, AlertCircle, GamepadIcon, Trophy } from 'lucide-react';

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
          const message = data.usesTournamentRosters 
            ? `${syncType} sync completed with tournament rosters: ${data.processed} processed, ${data.added} added, ${data.updated} updated`
            : `${syncType} sync completed: ${data.processed} processed, ${data.added} added, ${data.updated} updated`;
          toast.success(message);
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
          <GamepadIcon className="h-5 w-5 mr-2" />
          PandaScore Sync Controls
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => handleSync('Tournament Rosters + Matches', 'sync-pandascore-matches')}
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
              <>
                <Trophy className="h-4 w-4 mr-2" />
                Sync Tournament Rosters
              </>
            )}
          </Button>
          
          <Button
            onClick={() => handleSync('Upcoming + Tournament Rosters', 'sync-pandascore-upcoming-matches')}
            disabled={syncing['upcoming']}
            variant="outline"
            size="sm"
          >
            {syncing['upcoming'] ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              'Sync Upcoming + Rosters'
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
        </div>
        
        <div className="space-y-1 mt-2">
          <p className="text-xs text-green-600 dark:text-green-400">
            ✅ <strong>ENHANCED:</strong> Now uses Tournament Rosters API (/tournaments/{`{id}`}/rosters)
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            🏆 Extracts tournament.id from match → Fetches complete team rosters
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400">
            👥 Maps players by team ID with proper roles/positions for all games
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            🔄 Includes roster fallback for existing matches with missing player data
          </p>
          <p className="text-xs text-red-600 dark:text-red-400">
            ⚠️ Rate limiting: 300ms delays + tournament roster caching
          </p>
        </div>
      </div>
    </div>
  );
};
