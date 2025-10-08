import { SUPABASE_URL } from '@/integrations/supabase/client';

/**
 * Utilities to ensure assets are CORS-safe for html2canvas.
 * - Keep data:/blob:/relative untouched
 * - Proxy external http(s) via Supabase Edge Function
 * - Idempotent (won't double-proxy)
 */

export function isExternalUrl(url: string): boolean {
  try {
    if (!url) return false;
    if (url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:')) return false;
    const urlObj = new URL(url);
    const currentOrigin = window.location.origin;
    return urlObj.origin !== currentOrigin;
  } catch {
    return false;
  }
}

function supaOrigin(): string {
  return new URL(SUPABASE_URL).origin;
}

function alreadyProxied(url: string): boolean {
  try {
    const u = new URL(url, window.location.origin);
    return u.origin === supaOrigin() && u.pathname.includes('/functions/v1/public-image-proxy');
  } catch {
    return false;
  }
}

export function proxifyAsset(url?: string | null, forCanvas: boolean = false): string | undefined {
  if (!url) return undefined;

  // No need to proxy local/data/blob or when not rendering to canvas
  if (!forCanvas || !/^https?:\/\//i.test(url)) return url;

  // Idempotency guard
  if (alreadyProxied(url)) return url;

  return `${supaOrigin()}/functions/v1/public-image-proxy?url=${encodeURIComponent(url)}`;
}

export function proxifyAvatarUrl(avatarUrl?: string | null, forCanvas: boolean = false): string | undefined {
  if (!avatarUrl) return undefined;
  return proxifyAsset(avatarUrl, forCanvas);
}

export function proxifyFrameAsset(frameAsset?: string | null, forCanvas: boolean = false): string | undefined {
  if (!frameAsset) return undefined;
  return proxifyAsset(frameAsset, forCanvas);
}

export function proxifyBorderAsset(borderAsset?: string | null, forCanvas: boolean = false): string | undefined {
  if (!borderAsset) return undefined;
  return proxifyAsset(borderAsset, forCanvas);
}

export function proxifyBadgeAssets(
  badges: Array<{ asset_url: string }>,
  forCanvas: boolean = false
): Array<{ asset_url: string }> {
  return (badges ?? []).map(b => ({
    ...b,
    asset_url: proxifyAsset(b.asset_url, forCanvas) ?? b.asset_url,
  }));
}

export async function preloadAsset(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload asset: ${url}`));
    img.src = url;
  });
}

export async function preloadAssetsSafely(urls: string[]): Promise<void> {
  await Promise.allSettled(
    (urls || []).map((u) => preloadAsset(u))
  );
}
