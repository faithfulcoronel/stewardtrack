/**
 * DateTime Module Shared Utilities
 *
 * Provides common utility functions for datetime service handlers,
 * including tenant timezone retrieval with caching and formatting.
 *
 * Timezone caching is handled by the centralized settings-cache module,
 * which uses cookie-based caching that is warmed on login and cleared on logout.
 */

import {
  getTenantTimezone as getTimezoneFromCache,
  clearTenantSettingsCache,
  DEFAULT_TIMEZONE,
} from '@/lib/tenant/settings-cache';

// Re-export default timezone for backward compatibility
export { DEFAULT_TIMEZONE };

/**
 * Get tenant timezone from settings with caching
 *
 * This function retrieves the tenant's configured timezone, using the
 * centralized cookie-based cache that is warmed on login.
 *
 * @returns The tenant's timezone identifier (e.g., 'America/New_York', 'Asia/Manila')
 */
export async function getTenantTimezone(): Promise<string> {
  return getTimezoneFromCache();
}

/**
 * Clear the timezone cache
 *
 * This clears the centralized settings cache.
 * Note: This is typically called on logout automatically.
 */
export async function clearTimezoneCache(): Promise<void> {
  await clearTenantSettingsCache();
}

/**
 * Format a date using the tenant's timezone
 *
 * @param date - The date to format (Date object, string, or timestamp)
 * @param timezone - The IANA timezone identifier
 * @param options - Optional Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return '—';
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  };

  return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(dateObj);
}

/**
 * Format a datetime using the tenant's timezone
 *
 * @param date - The date to format (Date object, string, or timestamp)
 * @param timezone - The IANA timezone identifier
 * @param options - Optional Intl.DateTimeFormat options
 * @returns Formatted datetime string
 */
export function formatDateTime(
  date: Date | string | number,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return '—';
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  };

  return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(dateObj);
}

/**
 * Format a time using the tenant's timezone
 *
 * @param date - The date to format (Date object, string, or timestamp)
 * @param timezone - The IANA timezone identifier
 * @param options - Optional Intl.DateTimeFormat options
 * @returns Formatted time string
 */
export function formatTime(
  date: Date | string | number,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return '—';
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  };

  return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(dateObj);
}

/**
 * Format a date as relative time (e.g., "2 days ago", "in 3 hours")
 *
 * @param date - The date to format
 * @param _timezone - The IANA timezone identifier (kept for API consistency, not used in relative calculations)
 * @returns Relative time string
 */
export function formatRelativeTime(
  date: Date | string | number,
  _timezone: string
): string {
  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return '—';
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) === 1 ? '' : 's'} ago`;
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) === 1 ? '' : 's'} ago`;
}

/**
 * Format a date using the tenant's timezone setting
 *
 * This is a convenience function that combines getTenantTimezone and formatDate.
 * Use this when you need to format a single date and don't already have the timezone.
 *
 * @param date - The date to format
 * @param options - Optional formatting options
 * @returns Formatted date string
 */
export async function formatTenantDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): Promise<string> {
  const timezone = await getTenantTimezone();
  return formatDate(date, timezone, options);
}

/**
 * Format a datetime using the tenant's timezone setting
 *
 * This is a convenience function that combines getTenantTimezone and formatDateTime.
 * Use this when you need to format a single datetime and don't already have the timezone.
 *
 * @param date - The date to format
 * @param options - Optional formatting options
 * @returns Formatted datetime string
 */
export async function formatTenantDateTime(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): Promise<string> {
  const timezone = await getTenantTimezone();
  return formatDateTime(date, timezone, options);
}

/**
 * Format a time using the tenant's timezone setting
 *
 * This is a convenience function that combines getTenantTimezone and formatTime.
 *
 * @param date - The date to format
 * @param options - Optional formatting options
 * @returns Formatted time string
 */
export async function formatTenantTime(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): Promise<string> {
  const timezone = await getTenantTimezone();
  return formatTime(date, timezone, options);
}

/**
 * Get a Date object converted to the tenant's timezone
 * Note: JavaScript Date objects are always in UTC internally,
 * this returns a string representation in the target timezone
 *
 * @param date - The date to convert
 * @param timezone - The IANA timezone identifier
 * @returns ISO string representation in the target timezone
 */
export function toTimezoneString(
  date: Date | string | number,
  timezone: string
): string {
  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  return dateObj.toLocaleString('en-US', { timeZone: timezone });
}

/**
 * Common timezone options for select dropdowns
 * Organized by region for better UX
 */
export const TIMEZONE_OPTIONS = [
  // Americas
  { value: 'America/New_York', label: 'Eastern Time (ET) - New York' },
  { value: 'America/Chicago', label: 'Central Time (CT) - Chicago' },
  { value: 'America/Denver', label: 'Mountain Time (MT) - Denver' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT) - Los Angeles' },
  { value: 'America/Anchorage', label: 'Alaska Time - Anchorage' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time - Honolulu' },
  { value: 'America/Toronto', label: 'Eastern Time - Toronto' },
  { value: 'America/Vancouver', label: 'Pacific Time - Vancouver' },
  { value: 'America/Mexico_City', label: 'Central Time - Mexico City' },
  { value: 'America/Sao_Paulo', label: 'Brasilia Time - Sao Paulo' },
  { value: 'America/Buenos_Aires', label: 'Argentina Time - Buenos Aires' },

  // Europe
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT) - London' },
  { value: 'Europe/Paris', label: 'Central European Time (CET) - Paris' },
  { value: 'Europe/Berlin', label: 'Central European Time (CET) - Berlin' },
  { value: 'Europe/Rome', label: 'Central European Time (CET) - Rome' },
  { value: 'Europe/Madrid', label: 'Central European Time (CET) - Madrid' },
  { value: 'Europe/Amsterdam', label: 'Central European Time (CET) - Amsterdam' },
  { value: 'Europe/Moscow', label: 'Moscow Time - Moscow' },
  { value: 'Europe/Istanbul', label: 'Turkey Time - Istanbul' },

  // Asia
  { value: 'Asia/Dubai', label: 'Gulf Standard Time - Dubai' },
  { value: 'Asia/Kolkata', label: 'India Standard Time - Mumbai' },
  { value: 'Asia/Bangkok', label: 'Indochina Time - Bangkok' },
  { value: 'Asia/Singapore', label: 'Singapore Time - Singapore' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong Time - Hong Kong' },
  { value: 'Asia/Manila', label: 'Philippine Time - Manila' },
  { value: 'Asia/Shanghai', label: 'China Standard Time - Shanghai' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time - Tokyo' },
  { value: 'Asia/Seoul', label: 'Korea Standard Time - Seoul' },
  { value: 'Asia/Jakarta', label: 'Western Indonesia Time - Jakarta' },

  // Oceania
  { value: 'Australia/Sydney', label: 'Australian Eastern Time - Sydney' },
  { value: 'Australia/Melbourne', label: 'Australian Eastern Time - Melbourne' },
  { value: 'Australia/Perth', label: 'Australian Western Time - Perth' },
  { value: 'Pacific/Auckland', label: 'New Zealand Time - Auckland' },

  // Africa
  { value: 'Africa/Cairo', label: 'Eastern European Time - Cairo' },
  { value: 'Africa/Lagos', label: 'West Africa Time - Lagos' },
  { value: 'Africa/Johannesburg', label: 'South Africa Time - Johannesburg' },
  { value: 'Africa/Nairobi', label: 'East Africa Time - Nairobi' },

  // UTC
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
];
