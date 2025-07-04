
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { triggerFaceitLiveSync, triggerFaceitUpcomingSync } from '@/lib/supabaseFaceitApi';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Users, Wrench, CheckCircle } from 'lucide-react';

export const FaceitSyncButtons: React.FC = () => {
  const [syncingLive, setSyncingLive] = useState(false);
  const [syncingUpcoming, setSyncingUpcoming] = useState(false);
  const [fixingTimestamps, setFixingTimestamps] = useState(false);
  const { toast } = useToast();

  const handleLiveSync = async () => {
    setSyncingLive(true);
    try {
      // Sync 10 games: CS2, Valorant, League of Legends, Dota 2, Rocket League, Rainbow Six, PUBG, Team Fortress 2, World of Tanks, Call of Duty
      const success = await triggerFaceitLiveSync(['cs2', 'valorant', 'lol', 'dota2', 'rocketleague', 'rainbow6', 'pubg', 'tf2', 'wot', 'cod']);
      if (success) {
        toast({
          title: "Multi-Game Sync Started",
          description: "FACEIT live and finished matches sync has been triggered for 10 games (CS2, Valorant, LoL, Dota 2, Rocket League, Rainbow Six, PUBG, TF2, WoT, CoD) with enhanced raw data capture. Check back in a moment for updates.",
        });
      } else {
        toast({
          title: "Sync Failed",
          description: "Failed to trigger FACEIT live/finished matches sync. Please try again.",
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
      // Sync 10 games: CS2, Valorant, League of Legends, Dota 2, Rocket League, Rainbow Six, PUBG, Team Fortress 2, World of Tanks, Call of Duty
      const success = await triggerFaceitUpcomingSync(['cs2', 'valorant', 'lol', 'dota2', 'rocketleague', 'rainbow6', 'pubg', 'tf2', 'wot', 'cod']);
      if (success) {
        toast({
          title: "Multi-Game Sync Started",
          description: "FACEIT upcoming matches sync has been triggered for 10 games (CS2, Valorant, LoL, Dota 2, Rocket League, Rainbow Six, PUBG, TF2, WoT, CoD). Check back in a moment for updates.",
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

  const handleFixTimestamps = async () => {
    setFixingTimestamps(true);
    try {
      const { data, error } = await supabase.functions.invoke('fix-faceit-timestamps');
      
      if (error) {
        console.error('Error fixing timestamps:', error);
        toast({
          title: "Fix Failed",
          description: "Failed to fix FACEIT timestamps. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        toast({
          title: "Timestamps Fixed",
          description: `Fixed ${data.fixed} matches with incorrect timestamps.`,
        });
      } else {
        toast({
          title: "Fix Failed",
          description: data?.error || "Failed to fix timestamps.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fixing timestamps:', error);
      toast({
        title: "Fix Error",
        description: "An error occurred while fixing timestamps.",
        variant: "destructive",
      });
    } finally {
      setFixingTimestamps(false);
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
        <CheckCircle className={`h-4 w-4 mr-1 ${syncingLive ? 'animate-spin' : ''}`} />
        {syncingLive ? 'Syncing...' : 'Sync Live+Finished (10 Games)'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleUpcomingSync}
        disabled={syncingUpcoming}
        className="text-orange-400 border-orange-400/30 hover:bg-orange-500/10"
      >
        <Users className={`h-4 w-4 mr-1 ${syncingUpcoming ? 'animate-spin' : ''}`} />
        {syncingUpcoming ? 'Syncing...' : 'Sync Upcoming (10 Games)'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleFixTimestamps}
        disabled={fixingTimestamps}
        className="text-yellow-400 border-yellow-400/30 hover:bg-yellow-500/10"
      >
        <Wrench className={`h-4 w-4 mr-1 ${fixingTimestamps ? 'animate-spin' : ''}`} />
        {fixingTimestamps ? 'Fixing...' : 'Fix Timestamps'}
      </Button>
    </div>
  );
};
