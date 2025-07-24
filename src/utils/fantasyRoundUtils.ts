import { addDays, setHours, setMinutes, setSeconds, setMilliseconds, isBefore, isAfter } from 'date-fns';

// Create a 9am-to-9am daily window for fantasy rounds
export const createDailyFantasyWindow = (date: Date) => {
  // Set to 9am UTC for the given date
  const start = setMilliseconds(setSeconds(setMinutes(setHours(date, 9), 0), 0), 0);
  // End is 9am UTC the next day
  const end = addDays(start, 1);
  
  return { start, end };
};

// Get the current 9am-to-9am window based on current time
export const getCurrentFantasyWindow = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Check if we're before 9am today - if so, use yesterday's window
  const todayAt9am = setHours(today, 9);
  
  if (isBefore(now, todayAt9am)) {
    // We're before 9am today, so current window started yesterday at 9am
    const yesterday = addDays(today, -1);
    return createDailyFantasyWindow(yesterday);
  } else {
    // We're after 9am today, so current window started today at 9am
    return createDailyFantasyWindow(today);
  }
};

// Get the next 9am-to-9am window
export const getNextFantasyWindow = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayAt9am = setHours(today, 9);
  
  if (isBefore(now, todayAt9am)) {
    // We're before 9am today, so next window starts today at 9am
    return createDailyFantasyWindow(today);
  } else {
    // We're after 9am today, so next window starts tomorrow at 9am
    const tomorrow = addDays(today, 1);
    return createDailyFantasyWindow(tomorrow);
  }
};

// Check if a given time falls within a fantasy round window
export const isTimeInFantasyWindow = (time: Date, windowStart: Date, windowEnd: Date): boolean => {
  return !isBefore(time, windowStart) && !isAfter(time, windowEnd);
};

// Format window for display
export const formatFantasyWindow = (start: Date, end: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  };
  
  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', options);
  
  return `${startStr} - ${endStr}`;
};