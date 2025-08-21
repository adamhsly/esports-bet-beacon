import { useCallback } from 'react';
import { supabaseUnsafe as supabase } from '@/integrations/supabase/unsafeClient';
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

      const result = (data as any) as {
        xp?: number;
        unlocked_rewards_count?: number;
        deduped?: boolean;
      } | null;

      // Invalidate related data
      await Promise.all([
        refetchProgress(),
        refetchRewards()
      ]);

      if (result && !result.deduped) {
        toast({
          title: "XP Awarded!",
          description: `+${result.xp ?? 0} XP earned! ${result.unlocked_rewards_count && result.unlocked_rewards_count > 0 ? `🎁 ${result.unlocked_rewards_count} rewards unlocked!` : ''}`,
          duration: 3000
        });
      }

      return result;
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

      const result = (data as any) as {
        ok?: boolean;
        completed?: boolean;
        awarded_xp?: number;
      } | null;

      // Invalidate related data
      await Promise.all([
        refetchMissions(),
        refetchProgress(),
        refetchRewards()
      ]);

      if (result && result.ok && result.completed) {
        toast({
          title: "Mission Complete!",
          description: `${(result.awarded_xp ?? 0) > 0 ? `+${result.awarded_xp} XP earned!` : 'Mission completed!'}`,
          duration: 3000
        });
      }

      return result;
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