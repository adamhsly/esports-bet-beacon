/**
 * Utility functions for generating custom domain URLs for share cards
 */

// In production, this would be your actual domain
const CUSTOM_DOMAIN = 'https://fragsandfortunes.com';

// For development, you might want to use localhost or keep using Supabase
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

/**
 * Generates a custom domain URL for a share card
 * @param roundId - The fantasy round ID
 * @param userId - The user ID
 * @returns Custom domain URL for the share card
 */
export function generateCustomShareUrl(roundId: string, userId: string): string {
  // In development, you might want to use the direct Supabase URL for easier testing
  // or set up local proxy routing
  if (isDevelopment) {
    // For development, you can either:
    // 1. Use the Supabase URL directly (current behavior)
    // 2. Use localhost with proper routing setup
    // 3. Use the production domain for testing
    
    // Option 3: Use production domain even in development for consistency
    return `${CUSTOM_DOMAIN}/api/share/${roundId}/${userId}.png`;
  }

  return `${CUSTOM_DOMAIN}/api/share/${roundId}/${userId}.png`;
}

/**
 * Generates a direct Supabase storage URL (fallback)
 * @param roundId - The fantasy round ID  
 * @param userId - The user ID
 * @returns Direct Supabase storage URL
 */
export function generateDirectStorageUrl(roundId: string, userId: string): string {
  const supabaseUrl = 'https://zcjzeafelunqxmxzznos.supabase.co';
  return `${supabaseUrl}/storage/v1/object/public/shares/${roundId}/${userId}.png`;
}

/**
 * Gets the appropriate share URL based on environment and preferences
 * @param roundId - The fantasy round ID
 * @param userId - The user ID  
 * @param useCustomDomain - Whether to use custom domain (default: true)
 * @returns The appropriate share card URL
 */
export function getShareCardUrl(
  roundId: string, 
  userId: string, 
  useCustomDomain: boolean = true
): string {
  if (useCustomDomain) {
    return generateCustomShareUrl(roundId, userId);
  }
  
  return generateDirectStorageUrl(roundId, userId);
}
