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
  const currentPageViewId = useRef<string | null>(null);

  useEffect(() => {
    // Build full URL
    const pageUrl = window.location.origin + location.pathname + location.search;
    
    // Get referrer (only on initial page load, not on SPA navigation)
    const referrer = hasTrackedInitial.current ? null : document.referrer || null;
    
    // Reset the page view ID for new navigation
    currentPageViewId.current = null;

    // Track the page view and get the ID
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
          currentPageViewId.current = data.id;
        }
      })
      .catch(() => {
        // Silently fail - tracking should never affect user experience
      });

    hasTrackedInitial.current = true;
  }, [location.pathname, location.search]);

  // Track when page fully loads
  useEffect(() => {
    const markFullyLoaded = () => {
      // Small delay to ensure currentPageViewId is set
      setTimeout(() => {
        if (currentPageViewId.current) {
          fetch(`${SUPABASE_URL}/functions/v1/track-pageview`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: currentPageViewId.current,
              fully_loaded: true,
            }),
            keepalive: true,
          }).catch(() => {
            // Silently fail
          });
        }
      }, 100);
    };

    // Check if document is already loaded
    if (document.readyState === 'complete') {
      markFullyLoaded();
    } else {
      window.addEventListener('load', markFullyLoaded);
      return () => window.removeEventListener('load', markFullyLoaded);
    }
  }, [location.pathname, location.search]);
}
