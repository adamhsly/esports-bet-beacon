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
  is_paid?: boolean;
}

interface UseUpcomingProRoundOptions {
  isPaid?: boolean;
}

/**
 * Hook to fetch the upcoming pro round with fallback logic.
 * First tries to find a daily pro round, then falls back to weekly pro round.
 */
export const useUpcomingProRound = (options: UseUpcomingProRoundOptions = {}) => {
  const { isPaid = false } = options;
  const [round, setRound] = useState<UpcomingRound | null>(null);
  const [loading, setLoading] = useState(true);
  const [roundType, setRoundType] = useState<'daily' | 'weekly' | null>(null);

  useEffect(() => {
    const fetchUpcomingProRound = async () => {
      try {
        // First try to find a scheduled daily pro round
        const { data: dailyRound } = await supabase
          .from('fantasy_rounds')
          .select('id, type, start_date, end_date, status, round_name, game_type, team_type, is_paid')
          .eq('type', 'daily')
          .eq('status', 'scheduled')
          .eq('is_private', false)
          .eq('team_type', 'pro')
          .eq('is_paid', isPaid)
          .order('start_date', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (dailyRound) {
          setRound(dailyRound);
          setRoundType('daily');
          setLoading(false);
          return;
        }

        // Fallback: try to find a scheduled weekly pro round
        const { data: weeklyRound } = await supabase
          .from('fantasy_rounds')
          .select('id, type, start_date, end_date, status, round_name, game_type, team_type, is_paid')
          .eq('type', 'weekly')
          .eq('status', 'scheduled')
          .eq('is_private', false)
          .eq('team_type', 'pro')
          .eq('is_paid', isPaid)
          .order('start_date', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (weeklyRound) {
          setRound(weeklyRound);
          setRoundType('weekly');
        } else {
          setRound(null);
          setRoundType(null);
        }
      } catch (err) {
        console.error('Error fetching upcoming pro round:', err);
        setRound(null);
        setRoundType(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingProRound();
  }, [isPaid]);

  return { round, loading, roundType };
};
