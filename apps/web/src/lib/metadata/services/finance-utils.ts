/**
 * Finance Module Shared Utilities
 *
 * Provides common utility functions for finance service handlers,
 * including tenant currency retrieval with caching.
 *
 * Currency caching is handled by the centralized settings-cache module,
 * which uses cookie-based caching that is warmed on login and cleared on logout.
 */

import { formatCurrency as formatCurrencyUtil } from '@/enums/currency.enums';
import {
  getTenantCurrency as getCurrencyFromCache,
  clearTenantSettingsCache,
  DEFAULT_CURRENCY,
} from '@/lib/tenant/settings-cache';

// Re-export default currency for backward compatibility
export { DEFAULT_CURRENCY };

/**
 * Get tenant currency from settings with caching
 *
 * This function retrieves the tenant's configured currency, using the
 * centralized cookie-based cache that is warmed on login.
 *
 * @returns The tenant's currency code (e.g., 'USD', 'PHP', 'EUR')
 */
export async function getTenantCurrency(): Promise<string> {
  return getCurrencyFromCache();
}

/**
 * Clear the currency cache
 *
 * This clears the centralized settings cache.
 * Note: This is typically called on logout automatically.
 */
export async function clearCurrencyCache(): Promise<void> {
  await clearTenantSettingsCache();
}

/**
 * Format a monetary amount using the provided currency
 *
 * This wrapper function uses the centralized currency formatting utility
 * from the currency enums module, ensuring consistent formatting across
 * the application.
 *
 * @param amount - The monetary amount to format
 * @param currency - The currency code (e.g., 'USD', 'PHP')
 * @param options - Optional formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string,
  options?: { showCode?: boolean; compact?: boolean }
): string {
  return formatCurrencyUtil(amount, currency, options);
}

/**
 * Format a monetary amount using the tenant's currency setting
 *
 * This is a convenience function that combines getTenantCurrency and formatCurrency.
 * Use this when you need to format a single amount and don't already have the currency.
 *
 * @param amount - The monetary amount to format
 * @param options - Optional formatting options
 * @returns Formatted currency string
 */
export async function formatTenantCurrency(
  amount: number,
  options?: { showCode?: boolean; compact?: boolean }
): Promise<string> {
  const currency = await getTenantCurrency();
  return formatCurrency(amount, currency, options);
}
