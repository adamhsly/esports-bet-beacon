import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useMatchDetails(matchId: string, source: 'amateur' | 'professional') {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = async () => {
    if (!matchId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 Fetching heavy match details for ${source} match: ${matchId}`);
      
      const { data, error: dbError } = await supabase.rpc(
        'get_match_details_heavy',
        {
          p_match_id: matchId,
          p_source: source
        }
      );

      if (dbError) {
        console.error('❌ Error fetching match details:', dbError);
        setError(dbError.message);
        return;
      }

      console.log(`✅ Loaded heavy match details for ${matchId}`);
      setDetails(data);
      
    } catch (err) {
      console.error('❌ Error in useMatchDetails:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (matchId && source) {
      loadDetails();
    }
  }, [matchId, source]);

  return {
    details,
    loading,
    error,
    refetch: loadDetails
  };
}