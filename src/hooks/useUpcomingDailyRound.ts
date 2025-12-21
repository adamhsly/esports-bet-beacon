import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UpcomingRound {
  id: string;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
  round_name?: string;
  game_type?: string;
  team_type?: string;
}

export const useUpcomingDailyRound = () => {
  const [round, setRound] = useState<UpcomingRound | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpcomingDailyRound = async () => {
      try {
        // Fetch the next scheduled (coming soon) daily free pro round
        const { data, error } = await supabase
          .from('fantasy_rounds')
          .select('id, type, start_date, end_date, status, round_name, game_type, team_type')
          .eq('type', 'daily')
          .eq('status', 'scheduled')
          .eq('is_private', false)
          .eq('team_type', 'pro')
          .or('is_paid.is.null,is_paid.eq.false')
          .order('start_date', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setRound(data);
      } catch (err) {
        console.error('Error fetching upcoming daily round:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingDailyRound();
  }, []);

  return { round, loading };
};
