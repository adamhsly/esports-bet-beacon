import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const SUPABASE_URL = "https://zcjzeafelunqxmxzznos.supabase.co";
const MIN_ENGAGEMENT_MS = 2000; // 2 seconds minimum before marking as fully loaded

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
    const pageUrl = window.location.origin + location.pathname + location.search;
    const startTime = Date.now();

    // Get referrer: prefer document.referrer, fallback to utm_source from URL
    let referrer: string | null = null;
    if (!hasTrackedInitial.current) {
      if (document.referrer) {
        referrer = document.referrer;
      } else {
        // Fallback: extract utm_source from URL (e.g., tiktok, facebook, etc.)
        const params = new URLSearchParams(location.search);
        const utmSource = params.get('utm_source');
        if (utmSource) {
          referrer = utmSource;
        }
      }
    }

    let disposed = false;
    const cleanupFns: Array<() => void> = [];

    const postJson = (body: unknown, opts?: { keepalive?: boolean }) => {
      return fetch(`${SUPABASE_URL}/functions/v1/track-pageview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: opts?.keepalive,
      });
    };

    // Track the initial page view
    postJson({ page_url: pageUrl, referrer })
      .then((res) => res.json())
      .then((data) => {
        if (disposed || !data?.id) return;

        const pageViewId: string = data.id;

        const markFullyLoaded = () => {
          if (disposed || fullyLoadedSent.current.has(pageViewId)) return;

          // Ensure minimum engagement time before marking as fully loaded
          const elapsed = Date.now() - startTime;
          if (elapsed < MIN_ENGAGEMENT_MS) {
            const remaining = MIN_ENGAGEMENT_MS - elapsed;
            const t = setTimeout(() => markFullyLoaded(), remaining);
            cleanupFns.push(() => clearTimeout(t));
            return;
          }

          fullyLoadedSent.current.add(pageViewId);

          // Use fetch with keepalive for reliability
          postJson({ id: pageViewId, fully_loaded: true }, { keepalive: true }).catch(() => {
            fullyLoadedSent.current.delete(pageViewId);
          });
        };

        // Fire when page is ready
        if (document.readyState === 'complete') {
          markFullyLoaded();
        } else {
          const onLoad = () => markFullyLoaded();
          window.addEventListener('load', onLoad, { once: true });
          cleanupFns.push(() => window.removeEventListener('load', onLoad));
        }

        // Fire when user leaves (captures bounces)
        const onPageHide = () => markFullyLoaded();
        window.addEventListener('pagehide', onPageHide, { once: true });
        cleanupFns.push(() => window.removeEventListener('pagehide', onPageHide));

        const onVisibilityChange = () => {
          if (document.visibilityState === 'hidden') markFullyLoaded();
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        cleanupFns.push(() => document.removeEventListener('visibilitychange', onVisibilityChange));
      })
      .catch(() => {
        // Silently fail
      });

    hasTrackedInitial.current = true;

    return () => {
      disposed = true;
      cleanupFns.forEach((fn) => fn());
    };
  }, [location.pathname, location.search]);
}
