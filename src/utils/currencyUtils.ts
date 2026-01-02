/**
 * Currency utility functions for locale-aware currency formatting
 */

// Get the user's currency symbol based on their locale
export const getCurrencySymbol = (): string => {
  try {
    const locale = navigator.language || 'en-US';
    
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

    // Try exact match first, then try language-only match
    let currency = localeToCurrency[locale];
    if (!currency) {
      const languageCode = locale.split('-')[0];
      const matchingKey = Object.keys(localeToCurrency).find(key => key.startsWith(languageCode + '-'));
      currency = matchingKey ? localeToCurrency[matchingKey] : 'USD';
    }

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

// Format pence/cents to a currency string with the user's locale symbol
export const formatCurrency = (pence: number): string => {
  const symbol = getCurrencySymbol();
  const dollars = pence / 100;
  return dollars % 1 === 0 ? `${symbol}${dollars.toFixed(0)}` : `${symbol}${dollars.toFixed(2)}`;
};

// Format a dollar amount (not pence) with the user's locale symbol
export const formatDollarAmount = (amount: number): string => {
  const symbol = getCurrencySymbol();
  return amount % 1 === 0 ? `${symbol}${amount.toFixed(0)}` : `${symbol}${amount.toFixed(2)}`;
};
