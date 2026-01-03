/**
 * Currency Enums and Utilities
 *
 * Comprehensive currency support for multi-region operations.
 * Primary market: Philippines (PHP)
 * Expansion: Southeast Asia, then global
 *
 * Xendit supported currencies vary by region:
 * - Philippines: PHP
 * - Indonesia: IDR
 * - Malaysia: MYR (coming soon)
 * - Thailand: THB (coming soon)
 * - Vietnam: VND (coming soon)
 * - Global: USD, EUR, GBP, etc. (via Global Account)
 */

/**
 * Supported currency codes (ISO 4217)
 * Organized by region for expansion strategy
 */
export enum SupportedCurrency {
  // Primary Market - Philippines
  PHP = 'PHP',

  // Southeast Asia Expansion
  IDR = 'IDR', // Indonesia
  SGD = 'SGD', // Singapore
  MYR = 'MYR', // Malaysia
  THB = 'THB', // Thailand
  VND = 'VND', // Vietnam

  // Global/Default
  USD = 'USD', // US Dollar (default fallback)
  EUR = 'EUR', // Euro
  GBP = 'GBP', // British Pound
  AUD = 'AUD', // Australian Dollar
  JPY = 'JPY', // Japanese Yen
  KRW = 'KRW', // Korean Won
  HKD = 'HKD', // Hong Kong Dollar
  TWD = 'TWD', // Taiwan Dollar
  INR = 'INR', // Indian Rupee
  CAD = 'CAD', // Canadian Dollar
  NZD = 'NZD', // New Zealand Dollar
  CHF = 'CHF', // Swiss Franc
}

/**
 * Currency metadata with display information
 */
export interface CurrencyInfo {
  code: SupportedCurrency;
  name: string;
  symbol: string;
  symbolPosition: 'before' | 'after';
  decimalPlaces: number;
  decimalSeparator: string;
  thousandsSeparator: string;
  locale: string;
  region: CurrencyRegion;
  xenditSupported: boolean;
  minAmount: number; // Minimum transaction amount in currency
}

/**
 * Currency regions for grouping
 */
export enum CurrencyRegion {
  PHILIPPINES = 'philippines',
  SOUTHEAST_ASIA = 'southeast_asia',
  EAST_ASIA = 'east_asia',
  SOUTH_ASIA = 'south_asia',
  OCEANIA = 'oceania',
  EUROPE = 'europe',
  AMERICAS = 'americas',
}

/**
 * Display labels for currency regions
 */
export const CurrencyRegionLabels: Record<CurrencyRegion, string> = {
  [CurrencyRegion.PHILIPPINES]: 'Philippines',
  [CurrencyRegion.SOUTHEAST_ASIA]: 'Southeast Asia',
  [CurrencyRegion.EAST_ASIA]: 'East Asia',
  [CurrencyRegion.SOUTH_ASIA]: 'South Asia',
  [CurrencyRegion.OCEANIA]: 'Oceania',
  [CurrencyRegion.EUROPE]: 'Europe',
  [CurrencyRegion.AMERICAS]: 'Americas',
};

/**
 * Complete currency information database
 */
export const CURRENCY_INFO: Record<SupportedCurrency, CurrencyInfo> = {
  // Philippines
  [SupportedCurrency.PHP]: {
    code: SupportedCurrency.PHP,
    name: 'Philippine Peso',
    symbol: '₱',
    symbolPosition: 'before',
    decimalPlaces: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    locale: 'en-PH',
    region: CurrencyRegion.PHILIPPINES,
    xenditSupported: true,
    minAmount: 100,
  },

  // Southeast Asia
  [SupportedCurrency.IDR]: {
    code: SupportedCurrency.IDR,
    name: 'Indonesian Rupiah',
    symbol: 'Rp',
    symbolPosition: 'before',
    decimalPlaces: 0, // IDR doesn't use decimals
    decimalSeparator: ',',
    thousandsSeparator: '.',
    locale: 'id-ID',
    region: CurrencyRegion.SOUTHEAST_ASIA,
    xenditSupported: true,
    minAmount: 10000,
  },
  [SupportedCurrency.SGD]: {
    code: SupportedCurrency.SGD,
    name: 'Singapore Dollar',
    symbol: 'S$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    locale: 'en-SG',
    region: CurrencyRegion.SOUTHEAST_ASIA,
    xenditSupported: false, // Via Global Account
    minAmount: 1,
  },
  [SupportedCurrency.MYR]: {
    code: SupportedCurrency.MYR,
    name: 'Malaysian Ringgit',
    symbol: 'RM',
    symbolPosition: 'before',
    decimalPlaces: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    locale: 'ms-MY',
    region: CurrencyRegion.SOUTHEAST_ASIA,
    xenditSupported: false, // Coming soon
    minAmount: 1,
  },
  [SupportedCurrency.THB]: {
    code: SupportedCurrency.THB,
    name: 'Thai Baht',
    symbol: '฿',
    symbolPosition: 'before',
    decimalPlaces: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    locale: 'th-TH',
    region: CurrencyRegion.SOUTHEAST_ASIA,
    xenditSupported: false, // Coming soon
    minAmount: 20,
  },
  [SupportedCurrency.VND]: {
    code: SupportedCurrency.VND,
    name: 'Vietnamese Dong',
    symbol: '₫',
    symbolPosition: 'after',
    decimalPlaces: 0, // VND doesn't use decimals
    decimalSeparator: ',',
    thousandsSeparator: '.',
    locale: 'vi-VN',
    region: CurrencyRegion.SOUTHEAST_ASIA,
    xenditSupported: false, // Coming soon
    minAmount: 10000,
  },

  // Global/Default
  [SupportedCurrency.USD]: {
    code: SupportedCurrency.USD,
    name: 'US Dollar',
    symbol: '$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    locale: 'en-US',
    region: CurrencyRegion.AMERICAS,
    xenditSupported: true, // Via Global Account
    minAmount: 1,
  },
  [SupportedCurrency.EUR]: {
    code: SupportedCurrency.EUR,
    name: 'Euro',
    symbol: '€',
    symbolPosition: 'before',
    decimalPlaces: 2,
    decimalSeparator: ',',
    thousandsSeparator: '.',
    locale: 'de-DE',
    region: CurrencyRegion.EUROPE,
    xenditSupported: true, // Via Global Account
    minAmount: 1,
  },
  [SupportedCurrency.GBP]: {
    code: SupportedCurrency.GBP,
    name: 'British Pound',
    symbol: '£',
    symbolPosition: 'before',
    decimalPlaces: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    locale: 'en-GB',
    region: CurrencyRegion.EUROPE,
    xenditSupported: true, // Via Global Account
    minAmount: 1,
  },
  [SupportedCurrency.AUD]: {
    code: SupportedCurrency.AUD,
    name: 'Australian Dollar',
    symbol: 'A$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    locale: 'en-AU',
    region: CurrencyRegion.OCEANIA,
    xenditSupported: true, // Via Global Account
    minAmount: 1,
  },
  [SupportedCurrency.JPY]: {
    code: SupportedCurrency.JPY,
    name: 'Japanese Yen',
    symbol: '¥',
    symbolPosition: 'before',
    decimalPlaces: 0, // JPY doesn't use decimals
    decimalSeparator: '.',
    thousandsSeparator: ',',
    locale: 'ja-JP',
    region: CurrencyRegion.EAST_ASIA,
    xenditSupported: true, // Via Global Account
    minAmount: 100,
  },
  [SupportedCurrency.KRW]: {
    code: SupportedCurrency.KRW,
    name: 'South Korean Won',
    symbol: '₩',
    symbolPosition: 'before',
    decimalPlaces: 0, // KRW doesn't use decimals
    decimalSeparator: '.',
    thousandsSeparator: ',',
    locale: 'ko-KR',
    region: CurrencyRegion.EAST_ASIA,
    xenditSupported: false,
    minAmount: 1000,
  },
  [SupportedCurrency.HKD]: {
    code: SupportedCurrency.HKD,
    name: 'Hong Kong Dollar',
    symbol: 'HK$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    locale: 'zh-HK',
    region: CurrencyRegion.EAST_ASIA,
    xenditSupported: false,
    minAmount: 1,
  },
  [SupportedCurrency.TWD]: {
    code: SupportedCurrency.TWD,
    name: 'Taiwan Dollar',
    symbol: 'NT$',
    symbolPosition: 'before',
    decimalPlaces: 0, // TWD doesn't typically use decimals
    decimalSeparator: '.',
    thousandsSeparator: ',',
    locale: 'zh-TW',
    region: CurrencyRegion.EAST_ASIA,
    xenditSupported: false,
    minAmount: 30,
  },
  [SupportedCurrency.INR]: {
    code: SupportedCurrency.INR,
    name: 'Indian Rupee',
    symbol: '₹',
    symbolPosition: 'before',
    decimalPlaces: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    locale: 'en-IN',
    region: CurrencyRegion.SOUTH_ASIA,
    xenditSupported: false,
    minAmount: 1,
  },
  [SupportedCurrency.CAD]: {
    code: SupportedCurrency.CAD,
    name: 'Canadian Dollar',
    symbol: 'C$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    locale: 'en-CA',
    region: CurrencyRegion.AMERICAS,
    xenditSupported: true, // Via Global Account
    minAmount: 1,
  },
  [SupportedCurrency.NZD]: {
    code: SupportedCurrency.NZD,
    name: 'New Zealand Dollar',
    symbol: 'NZ$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    locale: 'en-NZ',
    region: CurrencyRegion.OCEANIA,
    xenditSupported: false,
    minAmount: 1,
  },
  [SupportedCurrency.CHF]: {
    code: SupportedCurrency.CHF,
    name: 'Swiss Franc',
    symbol: 'CHF',
    symbolPosition: 'before',
    decimalPlaces: 2,
    decimalSeparator: '.',
    thousandsSeparator: "'",
    locale: 'de-CH',
    region: CurrencyRegion.EUROPE,
    xenditSupported: false,
    minAmount: 1,
  },
};

/**
 * Country to currency mapping (ISO 3166-1 alpha-2 to ISO 4217)
 */
export const COUNTRY_TO_CURRENCY: Record<string, SupportedCurrency> = {
  // Philippines
  PH: SupportedCurrency.PHP,

  // Southeast Asia
  ID: SupportedCurrency.IDR,
  SG: SupportedCurrency.SGD,
  MY: SupportedCurrency.MYR,
  TH: SupportedCurrency.THB,
  VN: SupportedCurrency.VND,

  // East Asia
  JP: SupportedCurrency.JPY,
  KR: SupportedCurrency.KRW,
  HK: SupportedCurrency.HKD,
  TW: SupportedCurrency.TWD,
  CN: SupportedCurrency.USD, // China uses USD for international payments

  // South Asia
  IN: SupportedCurrency.INR,

  // Oceania
  AU: SupportedCurrency.AUD,
  NZ: SupportedCurrency.NZD,

  // Europe
  GB: SupportedCurrency.GBP,
  DE: SupportedCurrency.EUR,
  FR: SupportedCurrency.EUR,
  IT: SupportedCurrency.EUR,
  ES: SupportedCurrency.EUR,
  NL: SupportedCurrency.EUR,
  BE: SupportedCurrency.EUR,
  AT: SupportedCurrency.EUR,
  PT: SupportedCurrency.EUR,
  IE: SupportedCurrency.EUR,
  GR: SupportedCurrency.EUR,
  FI: SupportedCurrency.EUR,
  CH: SupportedCurrency.CHF,

  // Americas
  US: SupportedCurrency.USD,
  CA: SupportedCurrency.CAD,
  MX: SupportedCurrency.USD, // Mexico uses USD for SaaS
  BR: SupportedCurrency.USD, // Brazil uses USD for SaaS
  AR: SupportedCurrency.USD, // Argentina uses USD for SaaS
};

/**
 * Default currency when country cannot be determined
 */
export const DEFAULT_CURRENCY = SupportedCurrency.USD;

/**
 * Primary currency for the main market (Philippines)
 */
export const PRIMARY_CURRENCY = SupportedCurrency.PHP;

/**
 * Get currency info by code
 */
export function getCurrencyInfo(currency: string): CurrencyInfo | undefined {
  return CURRENCY_INFO[currency as SupportedCurrency];
}

/**
 * Get currency for a country code
 */
export function getCurrencyForCountry(countryCode: string): SupportedCurrency {
  const upperCode = countryCode.toUpperCase();
  return COUNTRY_TO_CURRENCY[upperCode] || DEFAULT_CURRENCY;
}

/**
 * Check if a currency is supported
 */
export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return currency in CURRENCY_INFO;
}

/**
 * Check if a currency is supported by Xendit
 */
export function isXenditSupported(currency: string): boolean {
  const info = getCurrencyInfo(currency);
  return info?.xenditSupported ?? false;
}

/**
 * Get all currencies supported by Xendit
 */
export function getXenditSupportedCurrencies(): SupportedCurrency[] {
  return Object.values(SupportedCurrency).filter((code) => CURRENCY_INFO[code].xenditSupported);
}

/**
 * Get currencies by region
 */
export function getCurrenciesByRegion(region: CurrencyRegion): SupportedCurrency[] {
  return Object.values(SupportedCurrency).filter((code) => CURRENCY_INFO[code].region === region);
}

/**
 * Format amount in a specific currency
 */
export function formatCurrency(
  amount: number,
  currency: string,
  options?: { showCode?: boolean; compact?: boolean }
): string {
  const info = getCurrencyInfo(currency);

  if (!info) {
    // Fallback to basic formatting
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  try {
    const formatter = new Intl.NumberFormat(info.locale, {
      style: 'currency',
      currency: info.code,
      minimumFractionDigits: info.decimalPlaces,
      maximumFractionDigits: info.decimalPlaces,
      notation: options?.compact ? 'compact' : 'standard',
    });

    let formatted = formatter.format(amount);

    // Optionally append currency code for clarity
    if (options?.showCode && !formatted.includes(info.code)) {
      formatted = `${formatted} ${info.code}`;
    }

    return formatted;
  } catch {
    // Fallback formatting
    const roundedAmount =
      info.decimalPlaces === 0 ? Math.round(amount) : amount.toFixed(info.decimalPlaces);

    if (info.symbolPosition === 'before') {
      return `${info.symbol}${roundedAmount}`;
    } else {
      return `${roundedAmount}${info.symbol}`;
    }
  }
}

/**
 * Convert amount to Xendit format
 *
 * IMPORTANT: Xendit's requirements vary by currency:
 * - PHP, IDR: Amount in whole currency units (pesos, rupiah) - NO conversion needed
 * - USD, EUR, GBP, etc.: Amount in smallest unit (cents) - multiply by 100
 *
 * This is different from many payment gateways that expect cents for all currencies.
 */
export function toXenditAmount(amount: number, currency: string): number {
  const info = getCurrencyInfo(currency);

  if (!info) {
    // Default: assume cents for unknown currencies
    return Math.round(amount * 100);
  }

  // PHP and IDR: Xendit expects whole currency units (pesos, rupiah)
  // These are the primary Xendit-supported local currencies
  if (currency === 'PHP' || currency === 'IDR') {
    return Math.round(amount);
  }

  // JPY, KRW, VND, TWD: No decimals, whole units
  if (info.decimalPlaces === 0) {
    return Math.round(amount);
  }

  // USD, EUR, GBP, etc. via Global Account: Convert to cents
  return Math.round(amount * Math.pow(10, info.decimalPlaces));
}

/**
 * Convert from Xendit format back to display amount
 *
 * Inverse of toXenditAmount - converts Xendit amounts back to display format.
 */
export function fromXenditAmount(xenditAmount: number, currency: string): number {
  const info = getCurrencyInfo(currency);

  if (!info) {
    // Default: assume cents for unknown currencies
    return xenditAmount / 100;
  }

  // PHP and IDR: Xendit uses whole currency units, no conversion needed
  if (currency === 'PHP' || currency === 'IDR') {
    return xenditAmount;
  }

  // JPY, KRW, VND, TWD: No decimals, whole units
  if (info.decimalPlaces === 0) {
    return xenditAmount;
  }

  // USD, EUR, GBP, etc.: Convert from cents back to whole units
  return xenditAmount / Math.pow(10, info.decimalPlaces);
}

/**
 * Get minimum amount for a currency
 */
export function getMinimumAmount(currency: string): number {
  const info = getCurrencyInfo(currency);
  return info?.minAmount ?? 1;
}

/**
 * Validate amount meets minimum for currency
 */
export function isValidAmount(amount: number, currency: string): boolean {
  const minAmount = getMinimumAmount(currency);
  return amount >= minAmount;
}

/**
 * Currency select options for dropdowns
 */
export function getCurrencySelectOptions(): Array<{
  value: string;
  label: string;
  symbol: string;
  region: string;
}> {
  return Object.values(SupportedCurrency).map((code) => {
    const info = CURRENCY_INFO[code];
    return {
      value: code,
      label: `${info.name} (${code})`,
      symbol: info.symbol,
      region: CurrencyRegionLabels[info.region],
    };
  });
}

/**
 * Get Xendit-supported currency options for admin configuration
 */
export function getXenditCurrencyOptions(): Array<{
  value: string;
  label: string;
  symbol: string;
}> {
  return getXenditSupportedCurrencies().map((code) => {
    const info = CURRENCY_INFO[code];
    return {
      value: code,
      label: `${info.name} (${code})`,
      symbol: info.symbol,
    };
  });
}
