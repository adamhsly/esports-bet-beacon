
import { format, startOfDay, endOfDay } from 'date-fns';
import { MatchInfo } from '@/components/MatchCard';
import { fromUTCString } from './timezoneUtils';

export interface MatchCountBreakdown {
  total: number;
  professional: number;
  amateur: number;
  live: number;
  upcoming: number;
}

export const getDetailedMatchCountsByDate = (matches: MatchInfo[]): Record<string, MatchCountBreakdown> => {
  const counts: Record<string, MatchCountBreakdown> = {};
  
  matches.forEach(match => {
    // Use consistent timezone-aware date parsing to match the display filtering logic
    const matchDate = fromUTCString(match.startTime);
    const dateKey = format(matchDate, 'yyyy-MM-dd');
    const now = new Date();
    
    if (!counts[dateKey]) {
      counts[dateKey] = {
        total: 0,
        professional: 0,
        amateur: 0,
        live: 0,
        upcoming: 0
      };
    }
    
    counts[dateKey].total++;
    
    // Count by source type
    if (match.source === 'professional') {
      counts[dateKey].professional++;
    } else {
      counts[dateKey].amateur++;
    }
    
    // Count by status (rough estimation based on time)
    const timeDiff = matchDate.getTime() - now.getTime();
    if (Math.abs(timeDiff) < 3 * 60 * 60 * 1000) { // Within 3 hours
      counts[dateKey].live++;
    } else if (timeDiff > 0) {
      counts[dateKey].upcoming++;
    }
  });
  
  return counts;
};

export const getTotalMatchCountsByDate = (matches: MatchInfo[]): Record<string, number> => {
  const detailedCounts = getDetailedMatchCountsByDate(matches);
  const totalCounts: Record<string, number> = {};
  
  Object.keys(detailedCounts).forEach(dateKey => {
    totalCounts[dateKey] = detailedCounts[dateKey].total;
  });
  
  return totalCounts;
};
