import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const SUPABASE_URL = "https://zcjzeafelunqxmxzznos.supabase.co";

/**
 * Minimal GDPR-compliant page view tracker
 * Fires on every route change, logs only page_url and referrer
 * No PII, no cookies, no fingerprinting
 */
export function usePageViewTracker() {
  const location = useLocation();
  const hasTrackedInitial = useRef(false);

  useEffect(() => {
    // Build full URL
    const pageUrl = window.location.origin + location.pathname + location.search;
    
    // Get referrer (only on initial page load, not on SPA navigation)
    const referrer = hasTrackedInitial.current ? null : document.referrer || null;
    
    // Fire and forget - don't block rendering
    fetch(`${SUPABASE_URL}/functions/v1/track-pageview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page_url: pageUrl,
        referrer,
      }),
      // Use keepalive to ensure request completes even if user navigates away
      keepalive: true,
    }).catch(() => {
      // Silently fail - tracking should never affect user experience
    });

    hasTrackedInitial.current = true;
  }, [location.pathname, location.search]);
}
