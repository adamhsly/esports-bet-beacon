import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RoundStarState {
  starTeamId: string | null;
  changeUsed: boolean;
  canChange: boolean;
}

export function useRoundStar(roundId: string) {
  const [state, setState] = useState<RoundStarState>({
    starTeamId: null,
    changeUsed: false,
    canChange: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStarState();
  }, [roundId]);

  const fetchStarState = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_star_team_state', {
        p_round_id: roundId
      });

      if (error) {
        console.error('Error fetching star state:', error);
        setState({
          starTeamId: null,
          changeUsed: false,
          canChange: true
        });
        return;
      }

      setState({
        starTeamId: (data as any)?.star_team_id || null,
        changeUsed: (data as any)?.change_used || false,
        canChange: (data as any)?.can_change || true
      });
    } catch (error) {
      console.error('Error fetching star state:', error);
    } finally {
      setLoading(false);
    }
  };

  const setStarTeam = async (teamId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('set-star-team', {
        body: {
          round_id: roundId,
          team_id: teamId
        }
      });

      if (error) {
        console.error('Error setting star team:', error);
        return { success: false, error: error.message || 'Failed to set star team' };
      }

      if (!data?.success) {
        console.error('Star team RPC failed:', data);
        return { success: false, error: data?.error || 'Failed to set star team' };
      }

      // Update local state on success
      setState(prev => ({
        ...prev,
        starTeamId: data.star_team_id,
        changeUsed: data.change_used,
        canChange: !data.change_used
      }));

      return { success: true };
    } catch (error) {
      console.error('Error setting star team:', error);
      return { success: false, error: 'Failed to set star team' };
    }
  };

  return {
    ...state,
    loading,
    setStarTeam,
    refresh: fetchStarState
  };
}