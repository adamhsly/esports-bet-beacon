
import { startOfDay, endOfDay, parseISO, isValid } from 'date-fns';

// Convert a date to UTC for consistent database comparisons
export const toUTCDate = (date: Date): Date => {
  return new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
};

// Convert UTC date string from database to local date for comparison
export const fromUTCString = (utcString: string): Date => {
  const parsed = parseISO(utcString);
  if (!isValid(parsed)) {
    console.warn(`Invalid date string: ${utcString}`);
    return new Date();
  }
  return parsed;
};

// Get start and end of day in UTC for consistent filtering
export const getUTCDayRange = (date: Date) => {
  const utcDate = toUTCDate(date);
  return {
    start: startOfDay(utcDate),
    end: endOfDay(utcDate)
  };
};

// Check if a UTC date string falls within a local date range
export const isDateInRange = (utcDateString: string, localDate: Date): boolean => {
  const utcDate = fromUTCString(utcDateString);
  const localStart = startOfDay(localDate);
  const localEnd = endOfDay(localDate);
  
  console.log(`🕐 Date comparison:`, {
    utcDateString,
    utcDate: utcDate.toISOString(),
    localDate: localDate.toDateString(),
    localStart: localStart.toISOString(),
    localEnd: localEnd.toISOString(),
    isInRange: utcDate >= localStart && utcDate <= localEnd
  });
  
  return utcDate >= localStart && utcDate <= localEnd;
};

// Find the most recent date from a list of matches
export const getMostRecentMatchDate = (matches: Array<{ startTime: string }>): Date => {
  if (matches.length === 0) return new Date();
  
  const sortedMatches = matches
    .map(match => fromUTCString(match.startTime))
    .filter(date => isValid(date))
    .sort((a, b) => b.getTime() - a.getTime());
  
  return sortedMatches[0] || new Date();
};
