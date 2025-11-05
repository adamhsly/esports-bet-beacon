/**
 * Utility functions for generating custom domain URLs for share cards
 */

// Route all share links through the Worker subdomain:
const WORKER_DOMAIN =
  (import.meta as any)?.env?.VITE_SHARE_BASE || "https://api.fragsandfortunes.com";

const isDev =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

/** Builds the Worker URL (preferred) */
export function generateCustomShareUrl(roundId: string, userId: string): string {
  return `${WORKER_DOMAIN}/api/share/${encodeURIComponent(roundId)}/${encodeURIComponent(
    userId
  )}.png`;
}

/** Direct Supabase fallback (optional) */
export function generateDirectStorageUrl(roundId: string, userId: string): string {
  const supabaseUrl = "https://zcjzeafelunqxmxzznos.supabase.co";
  return `${supabaseUrl}/storage/v1/object/public/shares/${encodeURIComponent(
    roundId
  )}/${encodeURIComponent(userId)}.png`;
}

/** Main chooser */
export function getShareCardUrl(
  roundId: string,
  userId: string,
  useCustomDomain: boolean = true
): string {
  if (useCustomDomain || !isDev) return generateCustomShareUrl(roundId, userId);
  return generateDirectStorageUrl(roundId, userId);
}
