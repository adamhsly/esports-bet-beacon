/**
 * Meta (Facebook) Pixel Tracking Utility
 * 
 * This module provides type-safe helpers for firing Meta Pixel events.
 * The pixel is loaded conditionally based on cookie consent in index.html.
 * 
 * @see https://business.facebook.com/business/help/402791146561655?id=1205376682832142
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Check if Meta Pixel is available and loaded
 */
const isPixelAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof window.fbq === 'function';
};

/**
 * Track a Lead event - used for key CTAs and free round joins
 * @param contentName Optional name to identify the source of the lead
 */
export const trackLead = (contentName?: string): void => {
  if (!isPixelAvailable()) return;
  
  window.fbq?.('track', 'Lead', {
    content_name: contentName,
  });
  console.log('[Meta Pixel] Lead event tracked:', contentName);
};

/**
 * Track a CompleteRegistration event - used when account is successfully created
 * @param method The registration method used (e.g., 'email', 'google')
 */
export const trackCompleteRegistration = (method: string = 'email'): void => {
  if (!isPixelAvailable()) return;
  
  window.fbq?.('track', 'CompleteRegistration', {
    content_name: 'account_created',
    status: true,
    registration_method: method,
  });
  console.log('[Meta Pixel] CompleteRegistration event tracked:', method);
};

/**
 * Track an AddToCart event - used for paid round reservations/joins
 * @param roundId The ID of the round
 * @param roundName The name of the round
 * @param entryFee The entry fee in pence
 */
export const trackAddToCart = (
  roundId: string,
  roundName?: string,
  entryFee?: number
): void => {
  if (!isPixelAvailable()) return;
  
  window.fbq?.('track', 'AddToCart', {
    content_ids: [roundId],
    content_name: roundName || 'Paid Round Entry',
    content_type: 'product',
    value: entryFee ? entryFee / 100 : 0, // Convert pence to dollars
    currency: 'USD',
  });
  console.log('[Meta Pixel] AddToCart event tracked:', { roundId, roundName, entryFee });
};

/**
 * Track a Purchase event - used when paid round entry is completed
 * @param roundId The ID of the round
 * @param roundName The name of the round
 * @param entryFee The entry fee in pence
 * @param paymentMethod How the payment was made (stripe, promo, etc.)
 */
export const trackPurchase = (
  roundId: string,
  roundName?: string,
  entryFee?: number,
  paymentMethod: 'stripe' | 'promo' = 'stripe'
): void => {
  if (!isPixelAvailable()) return;
  
  window.fbq?.('track', 'Purchase', {
    content_ids: [roundId],
    content_name: roundName || 'Paid Round Entry',
    content_type: 'product',
    value: entryFee ? entryFee / 100 : 0, // Convert pence to dollars
    currency: 'USD',
    payment_method: paymentMethod,
  });
  console.log('[Meta Pixel] Purchase event tracked:', { roundId, roundName, entryFee, paymentMethod });
};
