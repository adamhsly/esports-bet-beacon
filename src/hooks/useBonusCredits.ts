import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

export const useBonusCredits = () => {
  const { user } = useAuthUser();
  const [availableCredits, setAvailableCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableCredits = async () => {
    if (!user?.id) {
      setAvailableCredits(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .rpc('get_available_bonus_credits', { p_user: user.id });

      if (error) throw error;

      setAvailableCredits(data || 0);
    } catch (err) {
      console.error('Error fetching bonus credits:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bonus credits');
      setAvailableCredits(0);
    } finally {
      setLoading(false);
    }
  };

  const spendBonusCredits = async (roundId: string, amount: number): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase
        .rpc('spend_bonus_credits', {
          p_user: user.id,
          p_round: roundId,
          p_amount: amount
        });

      if (error) throw error;

      if (data) {
        // Refresh available credits after successful spending
        await fetchAvailableCredits();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error spending bonus credits:', err);
      return false;
    }
  };

  const grantBonusCredits = async (amount: number, source: string = 'xp_reward'): Promise<void> => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .rpc('grant_bonus_credits', {
          p_user: user.id,
          p_amount: amount,
          p_source: source
        });

      if (error) throw error;

      // Refresh available credits after granting
      await fetchAvailableCredits();
    } catch (err) {
      console.error('Error granting bonus credits:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchAvailableCredits();
  }, [user?.id]);

  // Set up real-time subscription for bonus credits changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`bonus_credits_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_bonus_credits',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchAvailableCredits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    availableCredits,
    loading,
    error,
    spendBonusCredits,
    grantBonusCredits,
    refetch: fetchAvailableCredits
  };
};