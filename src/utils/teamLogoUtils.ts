
/**
 * Utility functions for mapping team names to logo filenames
 * Based on the LootMarket esport-team-logos repository
 */

// Base path for GitHub raw content - the raw file content URL for the repo
const BASE_LOGO_PATH = 'https://raw.githubusercontent.com/lootmarket/esport-team-logos/master';

// Mapping of team names (lowercase) to their filenames in the logo repository
// This handles common naming variations like "NAVI" vs "Natus Vincere"
const teamLogoMap: Record<string, string> = {
  // CS:GO / CS2 Teams
  'natus vincere': 'navi',
  'navi': 'navi',
  'team liquid': 'liquid',
  'liquid': 'liquid',
  'fnatic': 'fnatic',
  'faze': 'faze',
  'faze clan': 'faze',
  'astralis': 'astralis',
  'g2': 'g2',
  'g2 esports': 'g2',
  'cloud9': 'cloud9',
  'vitality': 'vitality',
  'team vitality': 'vitality',
  'ence': 'ence',
  'ninjas in pyjamas': 'nip',
  'nip': 'nip',
  'complexity': 'complexity',
  'complexity gaming': 'complexity',
  'virtus.pro': 'virtuspro',
  'virtuspro': 'virtuspro',
  'heroic': 'heroic',
  'og': 'og',
  'mouz': 'mouz',
  'mousesports': 'mouz',
  'big': 'big',
  'spirit': 'spirit',
  'team spirit': 'spirit',

  // League of Legends Teams
  't1': 't1',
  'sk telecom t1': 't1',
  'skt': 't1',
  'damwon': 'damwon',
  'damwon gaming': 'damwon',
  'dwg kia': 'damwon',
  'dplus kia': 'damwon',
  'dk': 'damwon',
  'rng': 'rng',
  'royal never give up': 'rng',
  'edg': 'edg',
  'edward gaming': 'edg',
  'mad lions': 'mad',
  'gen.g': 'geng',
  'geng': 'geng',
  'gen.g esports': 'geng',
  'hanwha life esports': 'hle',
  'hle': 'hle',
  '100 thieves': '100t',
  '100t': '100t',
  'team solomid': 'tsm',
  'tsm': 'tsm',
  'c9': 'cloud9',
  'kt rolster': 'kt',
  'kt': 'kt',
  'drx': 'drx',
  'fredit brion': 'brion',
  'brion': 'brion',
  'nongshim red force': 'ns',
  'ns': 'ns',
  'sandbox gaming': 'sandbox',
  'sandbox': 'sandbox',
  'funplus phoenix': 'fpx',
  'fpx': 'fpx',
  'jd gaming': 'jdg',
  'jdg': 'jdg',
  
  // Dota 2 Teams
  'team secret': 'secret',
  'secret': 'secret',
  'evil geniuses': 'eg',
  'eg': 'eg',
  'lgd': 'lgd',
  'psg.lgd': 'lgd',
  'nigma': 'nigma',
  'alliance': 'alliance',
  'vp': 'virtuspro',
  
  // Added more teams for better coverage
  'nord esports': 'placeholder',
  'the ruddy sack': 'placeholder',
  
  // General default values for testing/placeholder
  'team1': 'placeholder',
  'team2': 'placeholder',
  'tbd': 'placeholder',
  'unknown': 'placeholder',
  'unknown team': 'placeholder'
};

/**
 * Gets the appropriate logo URL for a team based on the team name
 * Falls back to placeholder if no match is found
 * 
 * @param teamName The name of the team
 * @returns URL to the team's logo
 */
export const getTeamLogoUrl = (teamName: string): string => {
  if (!teamName) return '/placeholder.svg';
  
  // Normalize the team name (lowercase)
  const normalizedName = teamName.toLowerCase();
  
  console.log(`Looking up logo for team: "${normalizedName}"`);
  
  // Find the logo filename in our map
  const logoFilename = teamLogoMap[normalizedName];
  
  if (logoFilename) {
    console.log(`Found direct match for ${normalizedName} -> ${logoFilename}`);
    // GitHub raw content URL pattern
    return `${BASE_LOGO_PATH}/${logoFilename}.png`;
  }
  
  // Try to match part of the name
  const partialMatch = Object.keys(teamLogoMap).find(key => 
    normalizedName.includes(key) || key.includes(normalizedName)
  );
  
  if (partialMatch) {
    console.log(`Found partial match for ${normalizedName} -> ${partialMatch} -> ${teamLogoMap[partialMatch]}`);
    return `${BASE_LOGO_PATH}/${teamLogoMap[partialMatch]}.png`;
  }
  
  // Do not check team object here since we only have teamName at this point
  // This section was causing a ReferenceError
  
  // Fall back to placeholder
  console.log(`No logo found for team: ${teamName}`);
  return '/placeholder.svg';
};

/**
 * Checks if a URL is valid and not a placeholder
 * 
 * @param url The URL to check
 * @returns boolean indicating if the URL is valid and not a placeholder
 */
const isValidImageUrl = (url?: string | null): boolean => {
  if (!url) return false;
  if (url === '/placeholder.svg') return false;
  if (url.includes('undefined')) return false;
  return true;
};

/**
 * Gets the appropriate logo URL for a team based on team information
 * Uses the existing image URL if available, otherwise falls back to the logo mapping
 * 
 * @param team The team object containing name and possibly existing logo URL
 * @returns URL to the team's logo
 */
export const getEnhancedTeamLogoUrl = (team: {
  name: string;
  logo?: string | null;
  image_url?: string | null;
  id?: string;
  hash_image?: string | null;
}): string => {
  if (!team) {
    console.error('getEnhancedTeamLogoUrl received undefined or null team object');
    return '/placeholder.svg';
  }

  // Safety check for missing team name
  if (!team.name) {
    console.error('Team object is missing name property');
    return '/placeholder.svg';
  }

  // Check and log all available image sources for debugging
  console.log(`Team ${team.name} image sources:`, {
    logo: team.logo,
    image_url: team.image_url,
    id: team.id,
    hash_image: team.hash_image
  });

  // Enhanced debugging for edge cases
  if (team.logo && typeof team.logo === 'object') {
    console.warn(`Team ${team.name} has an object as logo instead of string:`, team.logo);
  }
  
  if (team.image_url && typeof team.image_url === 'object') {
    console.warn(`Team ${team.name} has an object as image_url instead of string:`, team.image_url);
  }

  // First, try to use team.logo if it's valid
  if (isValidImageUrl(team.logo)) {
    console.log(`Using provided logo for ${team.name}: ${team.logo}`);
    return team.logo;
  }
  
  // Next, try to use team.image_url if it's valid
  if (isValidImageUrl(team.image_url)) {
    console.log(`Using image_url for ${team.name}: ${team.image_url}`);
    return team.image_url;
  }
  
  // Next, try to generate an image URL from hash_image if available
  if (team.id && team.hash_image) {
    const hashImageUrl = `https://images.sportdevs.com/${team.hash_image}.png`;
    console.log(`Generated hash image URL for ${team.name}: ${hashImageUrl}`);
    return hashImageUrl;
  }
  
  // If all else fails, try to get the logo by team name mapping
  return getTeamLogoUrl(team.name);
};
