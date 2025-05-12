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
  'dk': 'damwon',
  'rng': 'rng',
  'royal never give up': 'rng',
  'edg': 'edg',
  'edward gaming': 'edg',
  'mad lions': 'mad',
  'gen.g': 'geng',
  'geng': 'geng',
  'hanwha life esports': 'hle',
  'hle': 'hle',
  '100 thieves': '100t',
  '100t': '100t',
  'team solomid': 'tsm',
  'tsm': 'tsm',
  'c9': 'cloud9',
  
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
  
  // General default values for testing/placeholder
  'team1': 'placeholder',
  'team2': 'placeholder',
  'tbd': 'placeholder',
  'unknown': 'placeholder'
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
  
  // Find the logo filename in our map
  const logoFilename = teamLogoMap[normalizedName];
  
  if (logoFilename) {
    // GitHub raw content URL pattern
    return `${BASE_LOGO_PATH}/${logoFilename}.png`;
  }
  
  // Try to match part of the name
  const partialMatch = Object.keys(teamLogoMap).find(key => 
    normalizedName.includes(key) || key.includes(normalizedName)
  );
  
  if (partialMatch) {
    return `${BASE_LOGO_PATH}/${teamLogoMap[partialMatch]}.png`;
  }
  
  // Fall back to placeholder
  console.log(`No logo found for team: ${teamName}`);
  return '/placeholder.svg';
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
  logo?: string;
  id?: string;
  hash_image?: string;
}): string => {
  // If we already have a valid logo that's not the placeholder, use it
  if (team.logo && team.logo !== '/placeholder.svg' && !team.logo.includes('undefined')) {
    return team.logo;
  }
  
  // Otherwise, try to get the mapped logo
  return getTeamLogoUrl(team.name);
};
