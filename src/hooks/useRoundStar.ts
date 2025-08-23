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
      
      // TODO: Replace with actual RPC call when implemented
      // For now, return stub data
      setState({
        starTeamId: null,
        changeUsed: false,
        canChange: true
      });
    } catch (error) {
      console.error('Error fetching star state:', error);
    } finally {
      setLoading(false);
    }
  };

  const setStarTeam = async (teamId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // TODO: Replace with actual RPC call when implemented
      // const { data, error } = await supabase.rpc('set_star_team', {
      //   p_round_id: roundId,
      //   p_team_id: teamId
      // });
      
      // For now, update local state
      setState(prev => ({
        ...prev,
        starTeamId: teamId,
        changeUsed: prev.starTeamId !== null, // If we had a star before, mark change as used
        canChange: prev.starTeamId === null // Can only change if this is the first time
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