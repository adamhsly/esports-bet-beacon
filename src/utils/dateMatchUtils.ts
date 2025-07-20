
import { format, startOfDay, endOfDay } from 'date-fns';
import { MatchInfo } from '@/components/MatchCard';

export const filterMatchesByDate = (matches: MatchInfo[], selectedDate: Date): MatchInfo[] => {
  const startOfSelectedDay = startOfDay(selectedDate);
  const endOfSelectedDay = endOfDay(selectedDate);

  return matches.filter(match => {
    const matchDate = new Date(match.startTime);
    return matchDate >= startOfSelectedDay && matchDate <= endOfSelectedDay;
  });
};

export const getMatchCountsByDate = (matches: MatchInfo[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  
  // Filter out matches with TBC/TBD teams (same logic as in Index.tsx)
  const filteredMatches = matches.filter(match => {
    const teamNames = match.teams.map(team => team.name?.toLowerCase() || '');
    return !teamNames.some(name => name === 'tbc' || name === 'tbd');
  });
  
  filteredMatches.forEach(match => {
    const dateKey = format(new Date(match.startTime), 'yyyy-MM-dd');
    counts[dateKey] = (counts[dateKey] || 0) + 1;
  });
  
  return counts;
};

export const formatMatchDate = (date: Date): string => {
  return format(date, 'EEEE, MMMM d, yyyy');
};
