type CacheItem<T> = {
  data: T;
  timestamp: number;
  expiresAt: number;
};

/**
 * Simple in-memory cache implementation
 */
class MemoryCache {
  private static instance: MemoryCache;
  private cache: Map<string, CacheItem<any>> = new Map();
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MemoryCache {
    if (!MemoryCache.instance) {
      MemoryCache.instance = new MemoryCache();
    }
    return MemoryCache.instance;
  }
  
  /**
   * Store data in cache with expiration
   * @param key - Cache key
   * @param data - Data to store
   * @param ttlSeconds - Time to live in seconds
   */
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + (ttlSeconds * 1000)
    });
    console.log(`Cache: Set "${key}" (expires in ${ttlSeconds}s)`);
  }
  
  /**
   * Get data from cache
   * @param key - Cache key
   * @returns The cached data or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    const now = Date.now();
    
    if (!item) {
      return undefined;
    }
    
    // Check if item is expired
    if (now > item.expiresAt) {
      console.log(`Cache: "${key}" expired, removing`);
      this.cache.delete(key);
      return undefined;
    }
    
    console.log(`Cache: Hit for "${key}" (age: ${Math.round((now - item.timestamp) / 1000)}s)`);
    return item.data as T;
  }
  
  /**
   * Check if key exists and is not expired
   * @param key - Cache key
   * @returns True if the key exists and is not expired
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    const isExpired = Date.now() > item.expiresAt;
    if (isExpired) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Remove item from cache
   * @param key - Cache key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    console.log(`Cache: Invalidated "${key}"`);
  }
  
  /**
   * Remove items with keys that match the provided pattern
   * @param pattern - String pattern to match keys against
   */
  invalidatePattern(pattern: RegExp): void {
    let count = 0;
    this.cache.forEach((_, key) => {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    });
    console.log(`Cache: Invalidated ${count} items matching pattern ${pattern}`);
  }
  
  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
    console.log(`Cache: Cleared all items`);
  }
  
  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const memoryCache = MemoryCache.getInstance();

/**
 * Create a cached version of an async function
 * @param fn - Function to cache
 * @param keyFn - Function to generate cache key from arguments
 * @param ttlSeconds - Cache TTL in seconds
 */
export function createCachedFunction<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyFn: (...args: TArgs) => string,
  ttlSeconds: number = 300
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const cacheKey = keyFn(...args);
    const cachedResult = memoryCache.get<TResult>(cacheKey);
    
    if (cachedResult !== undefined) {
      return cachedResult;
    }
    
    const result = await fn(...args);
    memoryCache.set(cacheKey, result, ttlSeconds);
    return result;
  };
}

// Cache TTL constants specifically for images (in seconds)
export const IMAGE_CACHE_TTL = {
  TEAM_IMAGE: 86400,      // 24 hours for team images
  TOURNAMENT_IMAGE: 86400 // 24 hours for tournament images
};

/**
 * Get team image URL from cache or construct it
 * @param teamId - Team ID
 * @param hashImage - Team hash image value
 * @returns Image URL
 */
export function getTeamImageUrl(teamId: string, hashImage?: string | null): string {
  if (!hashImage) {
    console.log(`getTeamImageUrl: No hash_image provided for team ${teamId}, returning placeholder`);
    return '/placeholder.svg';
  }
  
  const cacheKey = `team_image_${teamId}_${hashImage}`;
  const cachedUrl = memoryCache.get<string>(cacheKey);
  
  if (cachedUrl) {
    console.log(`getTeamImageUrl: Cache hit for team ${teamId} - ${cachedUrl}`);
    return cachedUrl;
  }
  
  // Improved image URL construction
  let imageUrl: string;
  
  if (hashImage.startsWith('http')) {
    imageUrl = hashImage;
  } else {
    // Handle potential hash variations (with or without extension)
    imageUrl = hashImage.includes('.') 
      ? `https://images.sportdevs.com/${hashImage}` 
      : `https://images.sportdevs.com/${hashImage}.png`;
  }
    
  console.log(`getTeamImageUrl: Generated image URL for team ${teamId} - ${imageUrl}`);
  memoryCache.set(cacheKey, imageUrl, IMAGE_CACHE_TTL.TEAM_IMAGE);
  
  return imageUrl;
}

/**
 * Get tournament image URL from cache or construct it
 * @param tournamentId - Tournament ID
 * @param hashImage - Tournament hash image value
 * @returns Image URL
 */
export function getTournamentImageUrl(tournamentId: string, hashImage?: string | null): string {
  if (!hashImage) {
    console.log(`getTournamentImageUrl: No hash_image provided for tournament ${tournamentId}, returning placeholder`);
    return '/placeholder.svg';
  }
  
  const cacheKey = `tournament_image_${tournamentId}_${hashImage}`;
  const cachedUrl = memoryCache.get<string>(cacheKey);
  
  if (cachedUrl) {
    console.log(`getTournamentImageUrl: Cache hit for tournament ${tournamentId} - ${cachedUrl}`);
    return cachedUrl;
  }
  
  // Improved image URL construction
  let imageUrl: string;
  
  if (hashImage.startsWith('http')) {
    imageUrl = hashImage;
  } else {
    // Handle potential hash variations (with or without extension)
    imageUrl = hashImage.includes('.')
      ? `https://images.sportdevs.com/${hashImage}`
      : `https://images.sportdevs.com/${hashImage}.png`;
  }
    
  console.log(`getTournamentImageUrl: Generated image URL for tournament ${tournamentId} - ${imageUrl}`);
  memoryCache.set(cacheKey, imageUrl, IMAGE_CACHE_TTL.TOURNAMENT_IMAGE);
  
  return imageUrl;
}
