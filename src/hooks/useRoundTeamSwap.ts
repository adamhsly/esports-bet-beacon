import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RoundTeamSwapState {
  oldTeamId: string | null;
  oldTeamName: string | null;
  oldTeamType: 'pro' | 'amateur' | null;
  newTeamId: string | null;
  swapUsed: boolean;
  canSwap: boolean;
  pointsAtSwap: number;
  swappedAt?: string;
}

export function useRoundTeamSwap(roundId: string) {
  const [state, setState] = useState<RoundTeamSwapState>({
    oldTeamId: null,
    oldTeamName: null,
    oldTeamType: null,
    newTeamId: null,
    swapUsed: false,
    canSwap: true,
    pointsAtSwap: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSwapState();
  }, [roundId]);

  const fetchSwapState = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_team_swap_state', {
        p_round_id: roundId
      });

      if (error) {
        console.error('Error fetching swap state:', error);
        setState({
          oldTeamId: null,
          oldTeamName: null,
          oldTeamType: null,
          newTeamId: null,
          swapUsed: false,
          canSwap: true,
          pointsAtSwap: 0
        });
        return;
      }

      const oldTeamId = (data as any)?.old_team_id || null;
      let oldTeamName: string | null = null;
      let oldTeamType: 'pro' | 'amateur' | null = null;
      
      // If there was a swap, fetch the old team's info
      if (oldTeamId) {
        // First try fantasy_team_prices (most reliable for team type)
        const { data: priceData } = await supabase
          .from('fantasy_team_prices')
          .select('team_name, team_type')
          .eq('round_id', roundId)
          .eq('team_id', oldTeamId)
          .limit(1)
          .maybeSingle();
        
        if (priceData) {
          oldTeamName = priceData.team_name;
          oldTeamType = priceData.team_type as 'pro' | 'amateur';
        } else {
          // Fallback to scores table
          const { data: scoreData } = await supabase
            .from('fantasy_round_scores')
            .select('team_name, team_type')
            .eq('round_id', roundId)
            .eq('team_id', oldTeamId)
            .limit(1)
            .maybeSingle();
          
          if (scoreData) {
            oldTeamName = scoreData.team_name;
            oldTeamType = scoreData.team_type as 'pro' | 'amateur';
          }
        }
      }

      setState({
        oldTeamId,
        oldTeamName,
        oldTeamType,
        newTeamId: (data as any)?.new_team_id || null,
        swapUsed: (data as any)?.swap_used || false,
        canSwap: (data as any)?.can_swap || true,
        pointsAtSwap: (data as any)?.points_at_swap || 0,
        swappedAt: (data as any)?.swapped_at
      });
    } catch (error) {
      console.error('Error fetching swap state:', error);
    } finally {
      setLoading(false);
    }
  };

  const swapTeam = async (
    oldTeamId: string, 
    newTeamId: string, 
    pointsAtSwap: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('set-team-swap', {
        body: {
          round_id: roundId,
          old_team_id: oldTeamId,
          new_team_id: newTeamId,
          points_at_swap: pointsAtSwap
        }
      });

      if (error) {
        console.error('Error swapping team:', error);
        return { success: false, error: error.message || 'Failed to swap team' };
      }

      if (!data?.success) {
        console.error('Team swap RPC failed:', data);
        return { success: false, error: data?.error || 'Failed to swap team' };
      }

      // Update local state on success
      setState(prev => ({
        ...prev,
        oldTeamId: data.old_team_id,
        newTeamId: data.new_team_id,
        swapUsed: data.swap_used,
        canSwap: !data.swap_used,
        pointsAtSwap: data.points_at_swap
      }));

      return { success: true };
    } catch (error) {
      console.error('Error swapping team:', error);
      return { success: false, error: 'Failed to swap team' };
    }
  };

  return {
    ...state,
    loading,
    swapTeam,
    refresh: fetchSwapState
  };
}
