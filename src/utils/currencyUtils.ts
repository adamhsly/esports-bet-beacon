/**
 * Currency utility functions for locale-aware currency formatting
 */

// Get the user's locale
const getUserLocale = (): string => {
  return navigator.language || 'en-US';
};

// Map common locales to their currencies
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
  'in-IN': 'INR',
  'en-IN': 'INR',
  'ru-RU': 'RUB',
  'pl-PL': 'PLN',
  'tr-TR': 'TRY',
  'br-BR': 'BRL',
  'pt-BR': 'BRL',
  'mx-MX': 'MXN',
  'es-MX': 'MXN',
  'se-SE': 'SEK',
  'sv-SE': 'SEK',
  'no-NO': 'NOK',
  'nb-NO': 'NOK',
  'dk-DK': 'DKK',
  'da-DK': 'DKK',
  'ch-CH': 'CHF',
  'de-CH': 'CHF',
  'fr-CH': 'CHF',
  'za-ZA': 'ZAR',
  'en-ZA': 'ZAR',
  'sg-SG': 'SGD',
  'en-SG': 'SGD',
  'hk-HK': 'HKD',
  'zh-HK': 'HKD',
  'en-HK': 'HKD',
  'ae-AE': 'AED',
  'ar-AE': 'AED',
  'th-TH': 'THB',
  'id-ID': 'IDR',
  'my-MY': 'MYR',
  'ph-PH': 'PHP',
  'vn-VN': 'VND',
  'vi-VN': 'VND',
};

// Get currency code for a locale
const getCurrencyCode = (locale: string): string => {
  let currency = localeToCurrency[locale];
  if (!currency) {
    const languageCode = locale.split('-')[0];
    const matchingKey = Object.keys(localeToCurrency).find(key => key.startsWith(languageCode + '-'));
    currency = matchingKey ? localeToCurrency[matchingKey] : 'USD';
  }
  return currency;
};

// Get the user's currency symbol based on their locale
export const getCurrencySymbol = (): string => {
  try {
    const locale = getUserLocale();
    const currency = getCurrencyCode(locale);

    // Get the currency symbol using Intl.NumberFormat
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    // Extract just the symbol
    const parts = formatter.formatToParts(0);
    const symbolPart = parts.find(part => part.type === 'currency');
    return symbolPart?.value || '$';
  } catch {
    return '$';
  }
};

// Format pence/cents to a currency string with proper locale formatting
export const formatCurrency = (pence: number): string => {
  try {
    const locale = getUserLocale();
    const currency = getCurrencyCode(locale);
    const amount = pence / 100;

    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    });

    return formatter.format(amount);
  } catch {
    const dollars = pence / 100;
    return `$${dollars.toFixed(2)}`;
  }
};

// Format a dollar amount (not pence) with proper locale formatting
export const formatDollarAmount = (amount: number): string => {
  try {
    const locale = getUserLocale();
    const currency = getCurrencyCode(locale);

    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    });

    return formatter.format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
};

/**
 * Format GBP pence as GBP currency string
 * Used for entry fees to show the actual charge amount
 */
export const formatGBP = (pence: number): string => {
  const amount = pence / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Round prize amount to nearest 5 in local currency
 * Makes prize displays cleaner (e.g., $12.60 → $15)
 */
export const roundPrizeAmount = (amount: number): number => {
  return Math.round(amount / 5) * 5;
};

/**
 * Round amount to nearest whole number
 * Makes converted currency displays cleaner (e.g., $12.60 → $13)
 */
export const roundToWhole = (amount: number): number => {
  return Math.round(amount);
};

/**
 * Format prize with local currency, optionally rounded to nearest 5
 * @param pence - Amount in GBP pence
 * @param exchangeRate - Rate from GBP to local currency
 * @param round - Whether to round to nearest 5 (default: true)
 */
export const formatPrizeWithRate = (
  pence: number, 
  exchangeRate: number = 1,
  round: boolean = true
): string => {
  try {
    const locale = getUserLocale();
    const currency = getCurrencyCode(locale);
    let localAmount = (pence / 100) * exchangeRate;
    
    if (round) {
      localAmount = roundPrizeAmount(localAmount);
    }

    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    return formatter.format(localAmount);
  } catch {
    const localAmount = round 
      ? roundPrizeAmount((pence / 100) * exchangeRate)
      : (pence / 100) * exchangeRate;
    return `$${localAmount.toFixed(0)}`;
  }
};

/**
 * Format amount with local currency using exchange rate, rounded to whole number
 * @param pence - Amount in GBP pence
 * @param exchangeRate - Rate from GBP to local currency
 */
export const formatWithRate = (
  pence: number, 
  exchangeRate: number = 1
): string => {
  try {
    const locale = getUserLocale();
    const currency = getCurrencyCode(locale);
    const localAmount = roundToWhole((pence / 100) * exchangeRate);

    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    return formatter.format(localAmount);
  } catch {
    const localAmount = roundToWhole((pence / 100) * exchangeRate);
    return `$${localAmount}`;
  }
};
