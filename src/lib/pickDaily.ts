// Deterministic daily mission picker using seeded shuffle

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Simple seeded random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

// Fisher-Yates shuffle with seeded random
function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  const rng = new SeededRandom(seed);
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

export function pickDaily(userId: string, dailyMissions: any[]): string[] {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const seedString = `${userId}:${today}`;
  const seed = simpleHash(seedString);
  
  // Get daily mission codes
  const dailyCodes = dailyMissions.map(m => m.code);
  
  // Shuffle deterministically and pick first 4
  const shuffled = shuffleWithSeed(dailyCodes, seed);
  return shuffled.slice(0, 4);
}