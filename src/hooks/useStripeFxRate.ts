import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Map locale to currency code
const localeToCurrency: Record<string, string> = {
  'en-US': 'USD',
  'en-GB': 'GBP',
  'en-AU': 'AUD',
  'en-CA': 'CAD',
  'en-NZ': 'NZD',
  'de-DE': 'EUR',
  'fr-FR': 'EUR',
  'es-ES': 'EUR',
  'it-IT': 'EUR',
  'nl-NL': 'EUR',
  'pt-PT': 'EUR',
  'ja-JP': 'JPY',
  'zh-CN': 'CNY',
  'ko-KR': 'KRW',
  'en-IN': 'INR',
  'hi-IN': 'INR',
  'ru-RU': 'RUB',
  'pl-PL': 'PLN',
  'tr-TR': 'TRY',
  'pt-BR': 'BRL',
  'es-MX': 'MXN',
  'sv-SE': 'SEK',
  'nb-NO': 'NOK',
  'da-DK': 'DKK',
  'de-CH': 'CHF',
  'fr-CH': 'CHF',
  'en-ZA': 'ZAR',
  'en-SG': 'SGD',
  'zh-HK': 'HKD',
  'en-HK': 'HKD',
  'ar-AE': 'AED',
  'th-TH': 'THB',
  'id-ID': 'IDR',
  'ms-MY': 'MYR',
  'en-PH': 'PHP',
  'vi-VN': 'VND',
};

// Get user's currency from locale
const getUserCurrency = (): string => {
  try {
    const locale = navigator.language || 'en-US';
    let currency = localeToCurrency[locale];
    
    if (!currency) {
      // Try matching just the language part
      const langCode = locale.split('-')[0];
      const matchingKey = Object.keys(localeToCurrency).find(key => 
        key.startsWith(langCode + '-')
      );
      currency = matchingKey ? localeToCurrency[matchingKey] : 'USD';
    }
    
    return currency;
  } catch {
    return 'USD';
  }
};

interface FxRateResponse {
  success: boolean;
  currency: string;
  rate: number;
  localAmount: number;
  gbpAmount: number;
  source: string;
  error?: string;
}

// Fetch FX rate from edge function
const fetchFxRate = async (currency: string): Promise<FxRateResponse> => {
  const { data, error } = await supabase.functions.invoke('get-stripe-fx-rate', {
    body: null,
    method: 'GET',
    // Pass currency as query param through headers workaround
  });

  // Since invoke doesn't support query params easily, we'll fetch directly
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-stripe-fx-rate?currency=${currency}&amount=100`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch FX rate');
  }

  return response.json();
};

export const useStripeFxRate = () => {
  const userCurrency = getUserCurrency();
  const isGBP = userCurrency === 'GBP';

  const { data, isLoading, error } = useQuery({
    queryKey: ['stripe-fx-rate', userCurrency],
    queryFn: () => fetchFxRate(userCurrency),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 2,
    enabled: !isGBP, // Don't fetch if user is in GBP
  });

  const rate = isGBP ? 1 : (data?.rate || 1);
  const currency = isGBP ? 'GBP' : (data?.currency || userCurrency);

  /**
   * Convert GBP pence to local currency amount and format as string
   * Returns the approximate local currency amount (what Stripe will charge)
   * Rounded to nearest whole number for cleaner display
   */
  const convertEntryFee = (pence: number): string => {
    if (isGBP) {
      // For GBP users, show GBP directly
      const amount = pence / 100;
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.round(amount));
    }

    const localAmount = Math.round((pence / 100) * rate);
    
    try {
      return new Intl.NumberFormat(navigator.language || 'en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(localAmount);
    } catch {
      return `${currency} ${localAmount}`;
    }
  };

  /**
   * Format any GBP pence amount to local currency, rounded to whole number
   */
  const formatLocalAmount = (pence: number): string => {
    if (isGBP) {
      const amount = Math.round(pence / 100);
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    }

    const localAmount = Math.round((pence / 100) * rate);
    
    try {
      return new Intl.NumberFormat(navigator.language || 'en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(localAmount);
    } catch {
      return `${currency} ${localAmount}`;
    }
  };

  /**
   * Get the raw converted amount (for calculations)
   */
  const getLocalAmount = (pence: number): number => {
    return (pence / 100) * rate;
  };

  /**
   * Get the rounded local amount (for display calculations)
   */
  const getRoundedLocalAmount = (pence: number): number => {
    return Math.round((pence / 100) * rate);
  };

  return {
    rate,
    currency,
    userCurrency,
    isGBP,
    isLoading,
    error,
    convertEntryFee,
    formatLocalAmount,
    getLocalAmount,
    getRoundedLocalAmount,
  };
};
