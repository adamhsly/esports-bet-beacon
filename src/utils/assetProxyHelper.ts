import { SUPABASE_URL } from '@/integrations/supabase/client';

/**
 * Utility to ensure all assets are CORS-safe for html2canvas
 * Proxies external URLs while keeping local assets unchanged
 */

export function isExternalUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const currentOrigin = window.location.origin;
    return urlObj.origin !== currentOrigin && !url.startsWith('/');
  } catch {
    return false;
  }
}

export function proxifyAsset(url: string, forCanvas: boolean = false): string {
  // Skip proxying if not for canvas or if it's already a local asset
  if (!forCanvas || !isExternalUrl(url)) {
    return url;
  }
  
  // Use the public image proxy for external URLs
  return `${SUPABASE_URL}/functions/v1/public-image-proxy?url=${encodeURIComponent(url)}`;
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

export function proxifyBadgeAssets(badges: Array<{ asset_url: string }>, forCanvas: boolean = false): Array<{ asset_url: string }> {
  return badges.map(badge => ({
    ...badge,
    asset_url: proxifyAsset(badge.asset_url, forCanvas)
  }));
}

export async function preloadAsset(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve();
    img.onerror = (e) => reject(new Error(`Failed to preload asset: ${url}`));
    img.src = url;
  });
}

export async function preloadAssetsSafely(urls: string[]): Promise<void> {
  await Promise.allSettled(
    urls.map(url => preloadAsset(url).catch(e => 
      console.warn(`Failed to preload asset ${url}:`, e)
    ))
  );
}