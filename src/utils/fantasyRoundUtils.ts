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

// Create a Monday-to-Monday weekly window for fantasy rounds
export const createWeeklyFantasyWindow = (date: Date) => {
  // Find the Monday of the given week at 9am UTC
  const dayOfWeek = date.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, so we need -6, otherwise 1 - dayOfWeek
  
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + daysToMonday);
  const start = setMilliseconds(setSeconds(setMinutes(setHours(monday, 9), 0), 0), 0);
  
  // End is next Monday at 9am UTC
  const end = addDays(start, 7);
  
  return { start, end };
};

// Get the current Monday-to-Monday window based on current time
export const getCurrentWeeklyFantasyWindow = () => {
  const now = new Date();
  const currentWeekWindow = createWeeklyFantasyWindow(now);
  
  // Check if we're before the start of current week window
  if (isBefore(now, currentWeekWindow.start)) {
    // We're before this week's Monday 9am, so current window is last week
    const lastWeek = addDays(now, -7);
    return createWeeklyFantasyWindow(lastWeek);
  } else {
    // We're after this week's Monday 9am, so current window is this week
    return currentWeekWindow;
  }
};

// Get the next Monday-to-Monday window
export const getNextWeeklyFantasyWindow = () => {
  const now = new Date();
  const currentWeekWindow = createWeeklyFantasyWindow(now);
  
  if (isBefore(now, currentWeekWindow.start)) {
    // We're before this week's Monday 9am, so next window is this week
    return currentWeekWindow;
  } else {
    // We're after this week's Monday 9am, so next window is next week
    const nextWeek = addDays(now, 7);
    return createWeeklyFantasyWindow(nextWeek);
  }
};

// Create a first-of-month to first-of-month monthly window for fantasy rounds
export const createMonthlyFantasyWindow = (date: Date) => {
  // Set to first day of the month at 9am UTC
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = setMilliseconds(setSeconds(setMinutes(setHours(firstDay, 9), 0), 0), 0);
  
  // End is first day of next month at 9am UTC
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const end = setMilliseconds(setSeconds(setMinutes(setHours(nextMonth, 9), 0), 0), 0);
  
  return { start, end };
};

// Get the current monthly window based on current time
export const getCurrentMonthlyFantasyWindow = () => {
  const now = new Date();
  const thisMonthWindow = createMonthlyFantasyWindow(now);
  
  // Check if we're before the start of this month's window
  if (isBefore(now, thisMonthWindow.start)) {
    // We're before this month's 1st at 9am, so current window is last month
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    return createMonthlyFantasyWindow(lastMonth);
  } else {
    // We're after this month's 1st at 9am, so current window is this month
    return thisMonthWindow;
  }
};

// Get the next monthly window
export const getNextMonthlyFantasyWindow = () => {
  const now = new Date();
  const thisMonthWindow = createMonthlyFantasyWindow(now);
  
  if (isBefore(now, thisMonthWindow.start)) {
    // We're before this month's 1st at 9am, so next window is this month
    return thisMonthWindow;
  } else {
    // We're after this month's 1st at 9am, so next window is next month
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return createMonthlyFantasyWindow(nextMonth);
  }
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