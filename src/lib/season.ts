export const SEASON_START_UTC = new Date('2025-01-27T00:00:00Z'); // Season 1 start

export function seasonWeek(now = new Date()): number {
  const startTime = SEASON_START_UTC.getTime();
  const currentTime = now.getTime();
  const diffMs = currentTime - startTime;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Calculate week number (1-8)
  return Math.max(1, Math.min(8, Math.ceil((diffDays + 1) / 7)));
}

export function monthWindow(): 'm1' | 'm2' {
  return seasonWeek() <= 4 ? 'm1' : 'm2';
}

export function todayKey(userId: string): string {
  return `day:${userId}:${new Date().toISOString().slice(0, 10)}`;
}