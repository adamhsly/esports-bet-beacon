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
          const pageViewId = data.id;
          
          // Function to mark page as fully loaded (only once per ID)
          const markFullyLoaded = () => {
            // Prevent duplicate updates for the same page view
            if (fullyLoadedSent.current.has(pageViewId)) {
              return;
            }
            fullyLoadedSent.current.add(pageViewId);
            
            fetch(`${SUPABASE_URL}/functions/v1/track-pageview`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                id: pageViewId,
                fully_loaded: true,
              }),
              keepalive: true,
            }).catch(() => {
              // Silently fail - remove from set so it can retry
              fullyLoadedSent.current.delete(pageViewId);
            });
          };

          // Check if document is already loaded
          if (document.readyState === 'complete') {
            // Page already loaded, send immediately
            markFullyLoaded();
          } else {
            // Wait for load event
            const loadHandler = () => markFullyLoaded();
            window.addEventListener('load', loadHandler, { once: true });
            
            // Fallback: also check after 3 seconds in case load event was missed
            const fallbackTimeout = setTimeout(() => {
              if (document.readyState === 'complete') {
                markFullyLoaded();
              }
            }, 3000);
            
            // Clean up fallback if load fires first
            window.addEventListener('load', () => clearTimeout(fallbackTimeout), { once: true });
          }
        }
      })
      .catch(() => {
        // Silently fail - tracking should never affect user experience
      });

    hasTrackedInitial.current = true;
  }, [location.pathname, location.search]);
}
