/**
 * Currency Detection Utilities
 *
 * Provides geo-location based currency detection for public users.
 * Uses multiple fallback strategies:
 * 1. Browser language/locale
 * 2. IP-based geolocation (via external API)
 * 3. Default to USD
 */

import {
  SupportedCurrency,
  DEFAULT_CURRENCY,
  COUNTRY_TO_CURRENCY,
  getCurrencyForCountry,
  isSupportedCurrency,
} from '@/enums/currency.enums';

/**
 * Detected currency result
 */
export interface DetectedCurrency {
  currency: SupportedCurrency;
  countryCode?: string;
  source: 'geo_ip' | 'browser_locale' | 'stored_preference' | 'default';
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Storage key for user's currency preference
 */
const CURRENCY_PREFERENCE_KEY = 'stewardtrack_currency';
const COUNTRY_CACHE_KEY = 'stewardtrack_country';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get stored currency preference from localStorage
 */
export function getStoredCurrencyPreference(): SupportedCurrency | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(CURRENCY_PREFERENCE_KEY);
    if (stored && isSupportedCurrency(stored)) {
      return stored as SupportedCurrency;
    }
  } catch {
    // localStorage not available
  }
  return null;
}

/**
 * Store currency preference in localStorage
 */
export function storeCurrencyPreference(currency: SupportedCurrency): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CURRENCY_PREFERENCE_KEY, currency);
  } catch {
    // localStorage not available
  }
}

/**
 * Get cached country code
 */
function getCachedCountry(): { countryCode: string; timestamp: number } | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(COUNTRY_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // localStorage not available
  }
  return null;
}

/**
 * Cache country code
 */
function cacheCountry(countryCode: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(
      COUNTRY_CACHE_KEY,
      JSON.stringify({ countryCode, timestamp: Date.now() })
    );
  } catch {
    // localStorage not available
  }
}

/**
 * Detect country from browser locale
 */
export function detectCountryFromLocale(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    // Get browser language
    const languages = navigator.languages || [navigator.language];

    for (const lang of languages) {
      // Language codes can be like 'en-US', 'fil-PH', 'id-ID'
      const parts = lang.split('-');
      if (parts.length >= 2) {
        const countryCode = parts[parts.length - 1].toUpperCase();
        // Validate it's a country code (2 letters)
        if (countryCode.length === 2 && /^[A-Z]{2}$/.test(countryCode)) {
          return countryCode;
        }
      }
    }
  } catch {
    // Browser APIs not available
  }
  return null;
}

/**
 * Detect country using IP geolocation API
 * Uses ipapi.co (free tier: 1000 requests/day)
 */
export async function detectCountryFromIP(): Promise<string | null> {
  // Check cache first
  const cached = getCachedCountry();
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.countryCode;
  }

  try {
    // Using ipapi.co for geolocation
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Geolocation API failed');
    }

    const data = await response.json();
    const countryCode = data.country_code;

    if (countryCode && typeof countryCode === 'string' && countryCode.length === 2) {
      cacheCountry(countryCode);
      return countryCode;
    }
  } catch (error) {
    console.warn('[CurrencyDetection] IP geolocation failed:', error);
  }

  return null;
}

/**
 * Detect currency based on user's location
 * Client-side function that uses multiple detection strategies
 */
export async function detectCurrency(): Promise<DetectedCurrency> {
  // 1. Check for stored preference first
  const storedPreference = getStoredCurrencyPreference();
  if (storedPreference) {
    return {
      currency: storedPreference,
      source: 'stored_preference',
      confidence: 'high',
    };
  }

  // 2. Try IP-based geolocation
  const ipCountry = await detectCountryFromIP();
  if (ipCountry) {
    const currency = getCurrencyForCountry(ipCountry);
    return {
      currency,
      countryCode: ipCountry,
      source: 'geo_ip',
      confidence: 'high',
    };
  }

  // 3. Try browser locale
  const localeCountry = detectCountryFromLocale();
  if (localeCountry) {
    const currency = getCurrencyForCountry(localeCountry);
    return {
      currency,
      countryCode: localeCountry,
      source: 'browser_locale',
      confidence: 'medium',
    };
  }

  // 4. Default fallback
  return {
    currency: DEFAULT_CURRENCY,
    source: 'default',
    confidence: 'low',
  };
}

/**
 * Server-side country detection from request headers
 */
export function detectCountryFromHeaders(headers: Headers): string | null {
  // Cloudflare header
  const cfCountry = headers.get('CF-IPCountry');
  if (cfCountry && cfCountry !== 'XX') {
    return cfCountry.toUpperCase();
  }

  // Vercel header
  const vercelCountry = headers.get('x-vercel-ip-country');
  if (vercelCountry) {
    return vercelCountry.toUpperCase();
  }

  // AWS CloudFront header
  const awsCountry = headers.get('CloudFront-Viewer-Country');
  if (awsCountry) {
    return awsCountry.toUpperCase();
  }

  // Accept-Language header fallback
  const acceptLanguage = headers.get('Accept-Language');
  if (acceptLanguage) {
    const matches = acceptLanguage.match(/[a-z]{2}-([A-Z]{2})/);
    if (matches && matches[1]) {
      return matches[1];
    }
  }

  return null;
}

/**
 * Server-side currency detection
 */
export function detectCurrencyFromRequest(headers: Headers): DetectedCurrency {
  const countryCode = detectCountryFromHeaders(headers);

  if (countryCode) {
    const currency = getCurrencyForCountry(countryCode);
    return {
      currency,
      countryCode,
      source: 'geo_ip',
      confidence: 'high',
    };
  }

  return {
    currency: DEFAULT_CURRENCY,
    source: 'default',
    confidence: 'low',
  };
}

/**
 * React hook for currency detection (use in client components)
 */
export function useCurrencyDetection() {
  // This is a utility function that returns the detection function
  // Actual hook implementation would need useState/useEffect
  return {
    detectCurrency,
    getStoredCurrencyPreference,
    storeCurrencyPreference,
  };
}
