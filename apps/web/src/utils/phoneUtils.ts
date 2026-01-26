/**
 * ================================================================================
 * PHONE NUMBER UTILITIES
 * ================================================================================
 *
 * Utility functions for formatting and validating phone numbers.
 * Ensures phone numbers are in E.164 format for Twilio SMS delivery.
 *
 * E.164 Format: +[country code][subscriber number]
 * Example: +639171234567 (Philippines mobile)
 *
 * ================================================================================
 */

/**
 * Country code configuration for common regions
 */
export interface CountryConfig {
  code: string;          // Country code without + (e.g., "63")
  mobilePrefix?: string; // Local mobile prefix to strip (e.g., "0" for Philippines)
  minLength: number;     // Minimum subscriber number length
  maxLength: number;     // Maximum subscriber number length
}

/**
 * Predefined country configurations
 */
export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  PH: {
    code: '63',
    mobilePrefix: '0',
    minLength: 10,  // 9xx xxx xxxx (10 digits without leading 0)
    maxLength: 10,
  },
  US: {
    code: '1',
    mobilePrefix: '1',
    minLength: 10,
    maxLength: 10,
  },
  SG: {
    code: '65',
    minLength: 8,
    maxLength: 8,
  },
  MY: {
    code: '60',
    mobilePrefix: '0',
    minLength: 9,
    maxLength: 10,
  },
  ID: {
    code: '62',
    mobilePrefix: '0',
    minLength: 9,
    maxLength: 12,
  },
  AU: {
    code: '61',
    mobilePrefix: '0',
    minLength: 9,
    maxLength: 9,
  },
  UK: {
    code: '44',
    mobilePrefix: '0',
    minLength: 10,
    maxLength: 10,
  },
};

/**
 * Options for phone number formatting
 */
export interface FormatPhoneOptions {
  /** Default country code to use (e.g., 'PH', 'US') */
  defaultCountry?: string;
  /** Custom country code if not using predefined countries (e.g., '63') */
  customCountryCode?: string;
  /** Whether to throw an error if formatting fails */
  throwOnError?: boolean;
}

/**
 * Result of phone number formatting
 */
export interface FormatPhoneResult {
  /** Whether the formatting was successful */
  success: boolean;
  /** The formatted phone number in E.164 format (e.g., +639171234567) */
  formatted?: string;
  /** The original input */
  original: string;
  /** Error message if formatting failed */
  error?: string;
  /** Detected or applied country code */
  countryCode?: string;
}

/**
 * Cleans a phone number by removing all non-digit characters except the leading +
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';

  // Preserve leading + if present
  const hasPlus = phone.trim().startsWith('+');

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  return hasPlus ? `+${digits}` : digits;
}

/**
 * Detects if a phone number already has a valid country code
 */
export function hasCountryCode(phone: string): boolean {
  const cleaned = cleanPhoneNumber(phone);
  return cleaned.startsWith('+') && cleaned.length > 10;
}

/**
 * Detects the country code from a phone number
 */
export function detectCountryCode(phone: string): string | null {
  const cleaned = cleanPhoneNumber(phone);

  if (!cleaned.startsWith('+')) {
    return null;
  }

  const digits = cleaned.substring(1);

  // Check against known country codes (sorted by length, longest first)
  const sortedConfigs = Object.entries(COUNTRY_CONFIGS)
    .sort((a, b) => b[1].code.length - a[1].code.length);

  for (const [countryKey, config] of sortedConfigs) {
    if (digits.startsWith(config.code)) {
      return countryKey;
    }
  }

  return null;
}

/**
 * Formats a phone number to E.164 format for Twilio
 *
 * @param phone - The phone number to format (can be in various formats)
 * @param options - Formatting options including default country
 * @returns FormatPhoneResult with the formatted number or error
 *
 * @example
 * // Philippine mobile numbers
 * formatPhoneForTwilio('09171234567', { defaultCountry: 'PH' })
 * // Returns: { success: true, formatted: '+639171234567' }
 *
 * formatPhoneForTwilio('9171234567', { defaultCountry: 'PH' })
 * // Returns: { success: true, formatted: '+639171234567' }
 *
 * formatPhoneForTwilio('+639171234567')
 * // Returns: { success: true, formatted: '+639171234567' }
 *
 * // US numbers
 * formatPhoneForTwilio('(555) 123-4567', { defaultCountry: 'US' })
 * // Returns: { success: true, formatted: '+15551234567' }
 */
export function formatPhoneForTwilio(
  phone: string | null | undefined,
  options: FormatPhoneOptions = {}
): FormatPhoneResult {
  const {
    defaultCountry = 'PH',
    customCountryCode,
    throwOnError = false
  } = options;

  // Handle null/undefined/empty
  if (!phone || typeof phone !== 'string') {
    const result: FormatPhoneResult = {
      success: false,
      original: phone ?? '',
      error: 'Phone number is required',
    };
    if (throwOnError) throw new Error(result.error);
    return result;
  }

  const original = phone;
  let cleaned = cleanPhoneNumber(phone);

  // If empty after cleaning, return error
  if (!cleaned) {
    const result: FormatPhoneResult = {
      success: false,
      original,
      error: 'Phone number contains no valid digits',
    };
    if (throwOnError) throw new Error(result.error);
    return result;
  }

  // If already has a country code (starts with +), validate and return
  if (cleaned.startsWith('+')) {
    const detectedCountry = detectCountryCode(cleaned);

    // Basic validation: should have at least 10 digits total
    if (cleaned.length < 11) {
      const result: FormatPhoneResult = {
        success: false,
        original,
        error: 'Phone number is too short',
      };
      if (throwOnError) throw new Error(result.error);
      return result;
    }

    return {
      success: true,
      formatted: cleaned,
      original,
      countryCode: detectedCountry ?? undefined,
    };
  }

  // Get country configuration
  const countryConfig = COUNTRY_CONFIGS[defaultCountry];
  const countryCode = customCountryCode || countryConfig?.code;

  if (!countryCode) {
    const result: FormatPhoneResult = {
      success: false,
      original,
      error: `Unknown country: ${defaultCountry}`,
    };
    if (throwOnError) throw new Error(result.error);
    return result;
  }

  // Handle Philippine-specific formats
  if (defaultCountry === 'PH' || countryCode === '63') {
    // Already starts with country code (without +)
    if (cleaned.startsWith('63') && cleaned.length >= 12) {
      return {
        success: true,
        formatted: `+${cleaned}`,
        original,
        countryCode: 'PH',
      };
    }

    // Starts with 0 (local format: 09xx xxx xxxx)
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return {
        success: true,
        formatted: `+63${cleaned.substring(1)}`,
        original,
        countryCode: 'PH',
      };
    }

    // Starts with 9 (subscriber number: 9xx xxx xxxx)
    if (cleaned.startsWith('9') && cleaned.length === 10) {
      return {
        success: true,
        formatted: `+63${cleaned}`,
        original,
        countryCode: 'PH',
      };
    }
  }

  // Generic handling for other countries
  if (countryConfig) {
    // Strip mobile prefix if present
    if (countryConfig.mobilePrefix && cleaned.startsWith(countryConfig.mobilePrefix)) {
      cleaned = cleaned.substring(countryConfig.mobilePrefix.length);
    }

    // Check if already starts with country code
    if (cleaned.startsWith(countryConfig.code)) {
      const subscriberLength = cleaned.length - countryConfig.code.length;
      if (subscriberLength >= countryConfig.minLength && subscriberLength <= countryConfig.maxLength) {
        return {
          success: true,
          formatted: `+${cleaned}`,
          original,
          countryCode: defaultCountry,
        };
      }
    }

    // Add country code if length matches subscriber number
    if (cleaned.length >= countryConfig.minLength && cleaned.length <= countryConfig.maxLength) {
      return {
        success: true,
        formatted: `+${countryConfig.code}${cleaned}`,
        original,
        countryCode: defaultCountry,
      };
    }
  }

  // Fallback: just add the country code
  if (cleaned.length >= 8 && cleaned.length <= 15) {
    return {
      success: true,
      formatted: `+${countryCode}${cleaned}`,
      original,
      countryCode: defaultCountry,
    };
  }

  const result: FormatPhoneResult = {
    success: false,
    original,
    error: `Unable to format phone number: invalid length (${cleaned.length} digits)`,
  };
  if (throwOnError) throw new Error(result.error);
  return result;
}

/**
 * Validates if a phone number is in valid E.164 format
 */
export function isValidE164(phone: string): boolean {
  if (!phone) return false;
  // E.164: + followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{6,14}$/;
  return e164Regex.test(phone);
}

/**
 * Formats a phone number for display (human-readable format)
 *
 * @example
 * formatPhoneForDisplay('+639171234567')
 * // Returns: '+63 917 123 4567'
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return '';

  const cleaned = cleanPhoneNumber(phone);

  if (!cleaned.startsWith('+')) {
    return phone; // Return original if not E.164
  }

  const digits = cleaned.substring(1);

  // Philippine format: +63 9xx xxx xxxx
  if (digits.startsWith('63') && digits.length === 12) {
    return `+63 ${digits.substring(2, 5)} ${digits.substring(5, 8)} ${digits.substring(8)}`;
  }

  // US format: +1 (xxx) xxx-xxxx
  if (digits.startsWith('1') && digits.length === 11) {
    return `+1 (${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7)}`;
  }

  // Generic: +xx xxx xxx xxxx
  if (digits.length > 10) {
    const countryCode = digits.substring(0, digits.length - 10);
    const rest = digits.substring(digits.length - 10);
    return `+${countryCode} ${rest.substring(0, 3)} ${rest.substring(3, 6)} ${rest.substring(6)}`;
  }

  return cleaned;
}

/**
 * Batch format multiple phone numbers
 */
export function formatPhonesForTwilio(
  phones: (string | null | undefined)[],
  options: FormatPhoneOptions = {}
): FormatPhoneResult[] {
  return phones.map(phone => formatPhoneForTwilio(phone, options));
}

/**
 * Get the default country code from environment
 * NOTE: For tenant-specific country, use SettingService.getTenantDefaultCountry()
 * This function is only for fallback when no tenant context is available
 */
export function getDefaultCountryCode(): string {
  return process.env.DEFAULT_PHONE_COUNTRY || 'PH';
}

/**
 * Infer country code from timezone
 * Maps IANA timezone identifiers to country codes
 */
export function inferCountryFromTimezone(timezone: string): string | null {
  const timezoneToCountry: Record<string, string> = {
    // Philippines
    'Asia/Manila': 'PH',
    // United States
    'America/New_York': 'US',
    'America/Chicago': 'US',
    'America/Denver': 'US',
    'America/Los_Angeles': 'US',
    'America/Anchorage': 'US',
    'Pacific/Honolulu': 'US',
    // Singapore
    'Asia/Singapore': 'SG',
    // Malaysia
    'Asia/Kuala_Lumpur': 'MY',
    'Asia/Kuching': 'MY',
    // Indonesia
    'Asia/Jakarta': 'ID',
    'Asia/Makassar': 'ID',
    'Asia/Jayapura': 'ID',
    // Australia
    'Australia/Sydney': 'AU',
    'Australia/Melbourne': 'AU',
    'Australia/Brisbane': 'AU',
    'Australia/Perth': 'AU',
    'Australia/Adelaide': 'AU',
    'Australia/Darwin': 'AU',
    'Australia/Hobart': 'AU',
    // United Kingdom
    'Europe/London': 'UK',
    // Canada (uses same country code format as US for phone)
    'America/Toronto': 'US',
    'America/Vancouver': 'US',
    // India
    'Asia/Kolkata': 'IN',
    // Japan
    'Asia/Tokyo': 'JP',
    // South Korea
    'Asia/Seoul': 'KR',
    // China
    'Asia/Shanghai': 'CN',
    // Thailand
    'Asia/Bangkok': 'TH',
    // Vietnam
    'Asia/Ho_Chi_Minh': 'VN',
  };

  return timezoneToCountry[timezone] || null;
}
