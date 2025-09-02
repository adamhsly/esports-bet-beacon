import { createClient } from '@supabase/supabase-js';

export type TeamType = 'pro' | 'amateur';

interface ResolveLogoOptions {
  supabase: ReturnType<typeof createClient>;
  teamType: TeamType;
  teamId?: string | number | null;
  teamName?: string | null;
}

// In-memory cache for logos
const logoCache = new Map<string, string | null>();

// Cache duration: 1 hour
const CACHE_DURATION = 60 * 60 * 1000;

interface CacheEntry {
  url: string | null;
  timestamp: number;
}

function getCacheKey(teamType: TeamType, teamId?: string | number | null, teamName?: string | null): string {
  const normalizedId = teamId ? String(teamId) : '';
  const normalizedName = teamName ? teamName.toLowerCase().trim() : '';
  return `logo:${teamType}:${normalizedId || normalizedName}`;
}

function getFromLocalStorage(key: string): string | null {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const entry: CacheEntry = JSON.parse(cached);
      if (Date.now() - entry.timestamp < CACHE_DURATION) {
        return entry.url;
      }
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn('Error reading from localStorage:', error);
  }
  return null;
}

function setToLocalStorage(key: string, url: string | null): void {
  try {
    const entry: CacheEntry = {
      url,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.warn('Error writing to localStorage:', error);
  }
}

function isValidHttpsUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

async function getProTeamLogo(
  supabase: ReturnType<typeof createClient>,
  teamId: string,
  teamName?: string | null
): Promise<string | null> {
  // Query pandascore_matches for last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: matches } = await supabase
    .from('pandascore_matches')
    .select('teams')
    .gte('start_time', sixMonthsAgo.toISOString())
    .in('status', ['finished', 'upcoming'])
    .not('teams', 'is', null)
    .order('start_time', { ascending: false })
    .limit(20);

  if (matches) {
    for (const match of matches) {
      if (match.teams && Array.isArray(match.teams)) {
        for (const teamObj of match.teams as any[]) {
          if (teamObj.type === 'Team' && teamObj.opponent) {
            const opponent = teamObj.opponent;
            // String comparison for team ID
            if (String(opponent.id) === teamId || opponent.slug === teamId) {
              // Try image_url first, then logo
              const logoUrl = opponent.image_url || opponent.logo;
              if (isValidHttpsUrl(logoUrl)) {
                return logoUrl;
              }
            }
          }
        }
      }
    }
  }

  // Note: pandascore_teams table may not exist, skipping fallback check

  return null;
}

async function getAmateurTeamLogo(
  supabase: ReturnType<typeof createClient>,
  teamId: string,
  teamName?: string | null
): Promise<string | null> {
  // First try the RPC function that aggregates all Faceit teams
  try {
    const { data: faceitTeams } = await supabase.rpc('get_all_faceit_teams');
    
    if (faceitTeams && Array.isArray(faceitTeams)) {
      const team = faceitTeams.find((t: any) => t.team_id === teamId);
      if (team && isValidHttpsUrl(team.logo_url)) {
        return team.logo_url;
      }
    }
  } catch (error) {
    console.warn('Error calling get_all_faceit_teams:', error);
  }

  // Fallback: query faceit_matches directly
  const { data: matches } = await supabase
    .from('faceit_matches')
    .select('teams')
    .not('teams', 'is', null)
    .order('started_at', { ascending: false })
    .limit(50);

  if (matches) {
    for (const match of matches) {
      if (match.teams && typeof match.teams === 'object') {
        // Check both faction1 and faction2
        for (const factionKey of ['faction1', 'faction2']) {
          const faction = (match.teams as any)[factionKey];
          if (faction) {
            const normalizedName = faction.name?.toLowerCase().trim();
            const normalizedTeamName = teamName?.toLowerCase().trim();
            
            // Match by ID or name
            if (faction.name === teamName || normalizedName === normalizedTeamName || faction.name === teamId) {
              const logoUrl = faction.avatar || faction.image || faction.logo;
              if (isValidHttpsUrl(logoUrl)) {
                return logoUrl;
              }
            }
          }
        }
      }
    }
  }

  return null;
}

export async function getTeamLogoUrl(opts: ResolveLogoOptions): Promise<string | null> {
  const { supabase, teamType, teamId, teamName } = opts;
  
  // Normalize teamId to string
  const normalizedTeamId = teamId ? String(teamId) : '';
  const cacheKey = getCacheKey(teamType, normalizedTeamId, teamName);
  
  // Check memory cache first
  if (logoCache.has(cacheKey)) {
    return logoCache.get(cacheKey) || null;
  }
  
  // Check localStorage cache
  const cachedUrl = getFromLocalStorage(cacheKey);
  if (cachedUrl !== null) {
    logoCache.set(cacheKey, cachedUrl);
    return cachedUrl;
  }
  
  let logoUrl: string | null = null;
  
  try {
    if (teamType === 'pro' && normalizedTeamId) {
      logoUrl = await getProTeamLogo(supabase, normalizedTeamId, teamName);
    } else if (teamType === 'amateur' && (normalizedTeamId || teamName)) {
      logoUrl = await getAmateurTeamLogo(supabase, normalizedTeamId || '', teamName);
    }
  } catch (error) {
    console.warn(`Error resolving logo for ${teamType} team ${normalizedTeamId || teamName}:`, error);
  }
  
  // Cache the result (even if null)
  logoCache.set(cacheKey, logoUrl);
  setToLocalStorage(cacheKey, logoUrl);
  
  return logoUrl;
}

// Utility to preload an image with CORS settings
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';
    
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    
    img.src = url;
  });
}

// Generate a simple placeholder SVG data URL
export function getPlaceholderLogo(teamName?: string): string {
  const initial = teamName ? teamName.charAt(0).toUpperCase() : '?';
  const svg = `
    <svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" fill="#374151" rx="12"/>
      <text x="60" y="75" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="#9CA3AF">${initial}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}