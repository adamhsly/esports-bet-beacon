import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MatchCountBreakdown {
  total: number;
  professional: number;
  amateur: number;
  live: number;
  upcoming: number;
}

interface MatchCountResult {
  match_date: string;
  source: string;
  count: number;
}

export function useMatchCounts(startDate: Date, endDate: Date, gameType: string = 'all') {
  const [counts, setCounts] = useState<Record<string, MatchCountBreakdown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCounts() {
      setLoading(true);
      setError(null);
      
      try {
        console.log('📊 Fetching match counts from materialized view');
        
        const { data, error: dbError } = await supabase.rpc(
          'get_daily_match_counts_fast',
          {
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0]
          }
        );

        if (dbError) {
          console.error('❌ Error fetching match counts:', dbError);
          setError(dbError.message);
          return;
        }

        // Process the results into the expected format
        const processedCounts: Record<string, MatchCountBreakdown> = {};
        
        if (Array.isArray(data)) {
          data.forEach((result: MatchCountResult) => {
            const dateKey = result.match_date;
            
            if (!processedCounts[dateKey]) {
              processedCounts[dateKey] = {
                total: 0,
                professional: 0,
                amateur: 0,
                live: 0,
                upcoming: 0
              };
            }
            
            processedCounts[dateKey].total += result.count;
            
            if (result.source === 'professional') {
              processedCounts[dateKey].professional += result.count;
            } else if (result.source === 'amateur') {
              processedCounts[dateKey].amateur += result.count;
            }
          });
        }

        console.log(`✅ Processed match counts for ${Object.keys(processedCounts).length} days`);
        setCounts(processedCounts);
        
      } catch (err) {
        console.error('❌ Error in useMatchCounts:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchCounts();
  }, [startDate, endDate, gameType]);

  return { counts, loading, error };
}

export function getTotalMatchCountsByDate(matchCountBreakdown: Record<string, MatchCountBreakdown>): Record<string, number> {
  const totalCounts: Record<string, number> = {};
  
  Object.keys(matchCountBreakdown).forEach(dateKey => {
    totalCounts[dateKey] = matchCountBreakdown[dateKey].total;
  });
  
  return totalCounts;
}