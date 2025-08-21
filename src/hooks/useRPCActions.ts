import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useProgress, useMissions, useRewards } from './useSupabaseData';

type XPKind = 'join_round' | 'set_lineup' | 'top50' | 'top10' | 'daily_login' | 'streak_day';

export const useRPCActions = () => {
  const { toast } = useToast();
  const { refetch: refetchProgress } = useProgress();
  const { refetch: refetchMissions } = useMissions();
  const { refetch: refetchRewards } = useRewards();

  const awardXP = useCallback(async (kind: XPKind, refId?: string) => {
    try {
      const { data, error } = await supabase.rpc('award_xp', {
        p_kind: kind,
        p_ref_id: refId || null
      });

      if (error) throw error;

      // Invalidate related data
      await Promise.all([
        refetchProgress(),
        refetchRewards()
      ]);

      if (data && !data.deduped) {
        toast({
          title: "XP Awarded!",
          description: `+${data.xp} XP earned! ${data.unlocked_rewards_count > 0 ? `🎁 ${data.unlocked_rewards_count} rewards unlocked!` : ''}`,
          duration: 3000
        });
      }

      return data;
    } catch (err: any) {
      toast({
        title: "Error awarding XP",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  }, [refetchProgress, refetchRewards, toast]);

  const progressMission = useCallback(async (code: string, inc: number = 1) => {
    try {
      const { data, error } = await supabase.rpc('progress_mission', {
        p_code: code,
        p_inc: inc
      });

      if (error) throw error;

      // Invalidate related data
      await Promise.all([
        refetchMissions(),
        refetchProgress(),
        refetchRewards()
      ]);

      if (data && data.ok && data.completed) {
        toast({
          title: "Mission Complete!",
          description: `${data.awarded_xp > 0 ? `+${data.awarded_xp} XP earned!` : 'Mission completed!'}`,
          duration: 3000
        });
      }

      return data;
    } catch (err: any) {
      toast({
        title: "Error updating mission",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  }, [refetchMissions, refetchProgress, refetchRewards, toast]);

  return {
    awardXP,
    progressMission
  };
};