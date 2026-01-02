/**
 * Currency Module
 *
 * Centralized exports for currency-related utilities.
 */

// Detection utilities
export {
  detectCurrency,
  detectCountryFromLocale,
  detectCountryFromIP,
  detectCountryFromHeaders,
  detectCurrencyFromRequest,
  getStoredCurrencyPreference,
  storeCurrencyPreference,
  type DetectedCurrency,
} from './currencyDetection';

// React hooks and context
export {
  CurrencyProvider,
  useCurrency,
  useFormatCurrency,
  useCurrencyInfo,
} from './useCurrency';

// Re-export from enums for convenience
export {
  SupportedCurrency,
  CurrencyRegion,
  CURRENCY_INFO,
  COUNTRY_TO_CURRENCY,
  DEFAULT_CURRENCY,
  PRIMARY_CURRENCY,
  getCurrencyInfo,
  getCurrencyForCountry,
  isSupportedCurrency,
  isXenditSupported,
  getXenditSupportedCurrencies,
  getCurrenciesByRegion,
  formatCurrency,
  toXenditAmount,
  fromXenditAmount,
  getMinimumAmount,
  isValidAmount,
  getCurrencySelectOptions,
  getXenditCurrencyOptions,
  type CurrencyInfo,
} from '@/enums/currency.enums';
