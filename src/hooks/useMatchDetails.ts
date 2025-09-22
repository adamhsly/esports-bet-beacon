import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseMatchDetailsReturn {
  fetchMatchDetails: (matchId: string, source: 'amateur' | 'professional') => Promise<any>;
  loading: boolean;
  error: string | null;
}

export const useMatchDetails = (): UseMatchDetailsReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMatchDetails = useCallback(async (matchId: string, source: 'amateur' | 'professional') => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 Fetching heavy match details for ${source} match:`, matchId);
      
      const { data, error: rpcError } = await supabase.rpc('get_match_details_heavy', {
        p_match_id: matchId,
        p_source: source
      });

      if (rpcError) {
        console.error('❌ Error fetching match details:', rpcError);
        throw new Error(rpcError.message);
      }

      console.log(`✅ Retrieved heavy match details for ${matchId}:`, Object.keys(data || {}));
      return data;

    } catch (err) {
      console.error('❌ Error in useMatchDetails:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch match details';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    fetchMatchDetails,
    loading,
    error
  };
};