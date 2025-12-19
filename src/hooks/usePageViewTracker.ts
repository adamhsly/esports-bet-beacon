import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const SUPABASE_URL = "https://zcjzeafelunqxmxzznos.supabase.co";

/**
 * Minimal GDPR-compliant page view tracker
 * Fires on every route change, logs page_url, referrer, and whether page fully loaded
 * No PII, no cookies, no fingerprinting
 */
export function usePageViewTracker() {
  const location = useLocation();
  const hasTrackedInitial = useRef(false);
  const fullyLoadedSent = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Build full URL
    const pageUrl = window.location.origin + location.pathname + location.search;

    // Get referrer (only on initial page load, not on SPA navigation)
    const referrer = hasTrackedInitial.current ? null : document.referrer || null;

    let disposed = false;
    const cleanupFns: Array<() => void> = [];

    const postJson = (body: unknown, opts?: { keepalive?: boolean }) => {
      return fetch(`${SUPABASE_URL}/functions/v1/track-pageview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        keepalive: opts?.keepalive,
      });
    };

    // Track the page view and then update fully_loaded when page is complete
    postJson({
      page_url: pageUrl,
      referrer,
    })
      .then((res) => res.json())
      .then((data) => {
        if (disposed) return;

        if (data?.id) {
          const pageViewId: string = data.id;

          const markFullyLoaded = () => {
            if (disposed) return;

            // Prevent duplicate updates for the same page view
            if (fullyLoadedSent.current.has(pageViewId)) {
              return;
            }
            fullyLoadedSent.current.add(pageViewId);

            const payload = JSON.stringify({ id: pageViewId, fully_loaded: true });
            let beaconOk = false;

            // Prefer sendBeacon for reliability on bounces/unloads
            try {
              if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
                const blob = new Blob([payload], { type: 'application/json' });
                beaconOk = navigator.sendBeacon(`${SUPABASE_URL}/functions/v1/track-pageview`, blob);
              }
            } catch {
              beaconOk = false;
            }

            if (beaconOk) return;

            // Fallback to fetch (keepalive helps if the user leaves quickly)
            postJson({ id: pageViewId, fully_loaded: true }, { keepalive: true }).catch(() => {
              // Silently fail - remove from set so it can retry
              fullyLoadedSent.current.delete(pageViewId);
            });
          };

          // 1) If already loaded, send immediately.
          // 2) Otherwise, listen for load.
          // 3) Always add pagehide/visibility fallbacks to catch quick exits.
          if (document.readyState === 'complete') {
            markFullyLoaded();
          } else {
            const onLoad = () => markFullyLoaded();
            window.addEventListener('load', onLoad, { once: true });
            cleanupFns.push(() => window.removeEventListener('load', onLoad));

            // Fallback: mark after a grace period even if load never fires (e.g., hanging resources)
            const fallbackTimeout = setTimeout(() => markFullyLoaded(), 6000);
            cleanupFns.push(() => clearTimeout(fallbackTimeout));
          }

          const onPageHide = () => markFullyLoaded();
          window.addEventListener('pagehide', onPageHide, { once: true });
          cleanupFns.push(() => window.removeEventListener('pagehide', onPageHide));

          const onVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
              markFullyLoaded();
            }
          };
          document.addEventListener('visibilitychange', onVisibilityChange);
          cleanupFns.push(() => document.removeEventListener('visibilitychange', onVisibilityChange));

          // Extra nudge for SPA navigations where document is already 'interactive'/'complete'
          if (document.readyState !== 'loading') {
            if ('requestIdleCallback' in window) {
              const idleId = (window as any).requestIdleCallback(() => markFullyLoaded(), { timeout: 2000 });
              cleanupFns.push(() => (window as any).cancelIdleCallback?.(idleId));
            } else {
              const t = setTimeout(() => markFullyLoaded(), 0);
              cleanupFns.push(() => clearTimeout(t));
            }
          }
        }
      })
      .catch(() => {
        // Silently fail - tracking should never affect user experience
      });

    hasTrackedInitial.current = true;

    return () => {
      disposed = true;
      cleanupFns.forEach((fn) => fn());
    };
  }, [location.pathname, location.search]);
}
