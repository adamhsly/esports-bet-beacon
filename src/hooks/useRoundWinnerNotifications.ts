import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

export interface RoundWinner {
  id: string;
  round_id: string;
  finish_position: number;
  total_score: number;
  credits_awarded: number;
  awarded_at: string;
  notification_viewed: boolean;
  round_type?: string;
}

export const useRoundWinnerNotifications = () => {
  const { user } = useAuthUser();
  const [unviewedWins, setUnviewedWins] = useState<RoundWinner[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUnviewedWins = async () => {
    if (!user?.id) {
      setUnviewedWins([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('fantasy_round_winners')
        .select(`
          id,
          round_id,
          finish_position,
          total_score,
          credits_awarded,
          awarded_at,
          notification_viewed,
          fantasy_rounds!inner(type)
        `)
        .eq('user_id', user.id)
        .eq('notification_viewed', false)
        .order('awarded_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(item => ({
        ...item,
        round_type: (item as any).fantasy_rounds?.type
      })) || [];

      setUnviewedWins(formattedData);
    } catch (error) {
      console.error('Error fetching unviewed wins:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async (winnerId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('fantasy_round_winners')
        .update({ notification_viewed: true })
        .eq('id', winnerId)
        .eq('user_id', user.id);

      if (error) throw error;

      setUnviewedWins(prev => prev.filter(w => w.id !== winnerId));
    } catch (error) {
      console.error('Error marking win as viewed:', error);
    }
  };

  useEffect(() => {
    fetchUnviewedWins();
  }, [user?.id]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`round_winners_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fantasy_round_winners',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchUnviewedWins();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    unviewedWins,
    loading,
    markAsViewed,
    refetch: fetchUnviewedWins
  };
};
