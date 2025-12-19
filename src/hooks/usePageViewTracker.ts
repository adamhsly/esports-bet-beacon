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

  useEffect(() => {
    // Build full URL
    const pageUrl = window.location.origin + location.pathname + location.search;
    
    // Get referrer (only on initial page load, not on SPA navigation)
    const referrer = hasTrackedInitial.current ? null : document.referrer || null;
    
    // Track the page view and then update fully_loaded when page is complete
    fetch(`${SUPABASE_URL}/functions/v1/track-pageview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page_url: pageUrl,
        referrer,
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.id) {
          // Once we have the ID, set up the fully_loaded update
          const markFullyLoaded = () => {
            fetch(`${SUPABASE_URL}/functions/v1/track-pageview`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                id: data.id,
                fully_loaded: true,
              }),
              keepalive: true,
            }).catch(() => {
              // Silently fail
            });
          };

          // Check if document is already loaded
          if (document.readyState === 'complete') {
            markFullyLoaded();
          } else {
            window.addEventListener('load', markFullyLoaded, { once: true });
          }
        }
      })
      .catch(() => {
        // Silently fail - tracking should never affect user experience
      });

    hasTrackedInitial.current = true;
  }, [location.pathname, location.search]);
}
