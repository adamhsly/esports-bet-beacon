import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MatchCountBreakdown } from '@/utils/matchCountUtils';
import { subDays, addDays, format } from 'date-fns';

interface UseMatchCountsReturn {
  matchCounts: Record<string, number>;
  detailedMatchCounts: Record<string, MatchCountBreakdown>;
  loading: boolean;
  error: string | null;
}

export const useMatchCounts = (selectedDate: Date): UseMatchCountsReturn => {
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [detailedMatchCounts, setDetailedMatchCounts] = useState<Record<string, MatchCountBreakdown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatchCounts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('📊 Fetching optimized match counts for date:', format(selectedDate, 'yyyy-MM-dd'));
        
        // Fetch ±7 days around selected date using the fast materialized view function
        const startDate = format(subDays(selectedDate, 7), 'yyyy-MM-dd');
        const endDate = format(addDays(selectedDate, 7), 'yyyy-MM-dd');
        
        const { data, error: rpcError } = await supabase.rpc('get_daily_match_counts_fast', {
          start_date: startDate,
          end_date: endDate
        });

        if (rpcError) {
          console.error('❌ Error fetching match counts:', rpcError);
          throw new Error(rpcError.message);
        }

        console.log(`📊 Retrieved ${data?.length || 0} count records from materialized view`);

        // Process results into the expected format
        const combinedCounts: Record<string, MatchCountBreakdown> = {};
        const simpleCounts: Record<string, number> = {};

        if (data && Array.isArray(data)) {
          data.forEach((count: any) => {
            const dateKey = count.match_date;
            
            if (!combinedCounts[dateKey]) {
              combinedCounts[dateKey] = {
                total: 0,
                professional: 0,
                amateur: 0,
                live: 0,
                upcoming: 0
              };
            }
            
            combinedCounts[dateKey].total += count.count;
            
            if (count.source === 'faceit') {
              combinedCounts[dateKey].amateur += count.count;
            } else if (count.source === 'pandascore') {
              combinedCounts[dateKey].professional += count.count;
            }
            
            simpleCounts[dateKey] = combinedCounts[dateKey].total;
          });
        }

        console.log(`✅ Processed match counts for ${Object.keys(combinedCounts).length} days`);
        
        setDetailedMatchCounts(combinedCounts);
        setMatchCounts(simpleCounts);

      } catch (err) {
        console.error('❌ Error in useMatchCounts:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch match counts');
      } finally {
        setLoading(false);
      }
    };

    fetchMatchCounts();
  }, [selectedDate]);

  return {
    matchCounts,
    detailedMatchCounts,
    loading,
    error
  };
};