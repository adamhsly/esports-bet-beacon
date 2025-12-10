import { useEffect } from 'react';

const REFERRAL_STORAGE_KEY = 'ff_referral_code';

export const useReferralTracking = () => {
  useEffect(() => {
    // Check for referral code in URL on mount
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
      // Store the referral code in localStorage
      localStorage.setItem(REFERRAL_STORAGE_KEY, refCode);
      
      // Clean up the URL (optional, remove ?ref= from URL)
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('ref');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, []);
};

export const getReferralCode = (): string | null => {
  return localStorage.getItem(REFERRAL_STORAGE_KEY);
};

export const clearReferralCode = () => {
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
};
