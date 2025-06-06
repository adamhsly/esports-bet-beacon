
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { triggerFaceitLiveSync, triggerFaceitUpcomingSync } from '@/lib/supabaseFaceitApi';
import { RefreshCw, Users } from 'lucide-react';

export const FaceitSyncButtons: React.FC = () => {
  const [syncingLive, setSyncingLive] = useState(false);
  const [syncingUpcoming, setSyncingUpcoming] = useState(false);
  const { toast } = useToast();

  const handleLiveSync = async () => {
    setSyncingLive(true);
    try {
      const success = await triggerFaceitLiveSync();
      if (success) {
        toast({
          title: "Sync Started",
          description: "FACEIT live matches sync has been triggered. Check back in a moment for updates.",
        });
      } else {
        toast({
          title: "Sync Failed",
          description: "Failed to trigger FACEIT live matches sync. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error triggering live sync:', error);
      toast({
        title: "Sync Error",
        description: "An error occurred while triggering the sync.",
        variant: "destructive",
      });
    } finally {
      setSyncingLive(false);
    }
  };

  const handleUpcomingSync = async () => {
    setSyncingUpcoming(true);
    try {
      const success = await triggerFaceitUpcomingSync();
      if (success) {
        toast({
          title: "Sync Started",
          description: "FACEIT upcoming matches sync has been triggered. Check back in a moment for updates.",
        });
      } else {
        toast({
          title: "Sync Failed",
          description: "Failed to trigger FACEIT upcoming matches sync. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error triggering upcoming sync:', error);
      toast({
        title: "Sync Error",
        description: "An error occurred while triggering the sync.",
        variant: "destructive",
      });
    } finally {
      setSyncingUpcoming(false);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <Button
        variant="outline"
        size="sm"
        onClick={handleLiveSync}
        disabled={syncingLive}
        className="text-orange-400 border-orange-400/30 hover:bg-orange-500/10"
      >
        <RefreshCw className={`h-4 w-4 mr-1 ${syncingLive ? 'animate-spin' : ''}`} />
        {syncingLive ? 'Syncing...' : 'Sync Live'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleUpcomingSync}
        disabled={syncingUpcoming}
        className="text-orange-400 border-orange-400/30 hover:bg-orange-500/10"
      >
        <Users className={`h-4 w-4 mr-1 ${syncingUpcoming ? 'animate-spin' : ''}`} />
        {syncingUpcoming ? 'Syncing...' : 'Sync Upcoming'}
      </Button>
    </div>
  );
};
