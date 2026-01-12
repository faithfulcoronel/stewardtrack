/**
 * Tenant Settings Cache
 *
 * Provides cookie-based caching for tenant settings (timezone, currency)
 * that are cached on login and cleared on logout.
 *
 * This approach:
 * - Caches settings in cookies for persistence across requests
 * - Uses extended TTL (24 hours) since settings rarely change
 * - Falls back to tenant subscription defaults if settings not configured
 * - Clears on logout for security
 */

import { cookies } from 'next/headers';

import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { SettingService } from '@/services/SettingService';

// Cookie keys for tenant settings
const TENANT_TIMEZONE_KEY = 'st-tenant-tz';
const TENANT_CURRENCY_KEY = 'st-tenant-cur';

// Default values
export const DEFAULT_TIMEZONE = 'UTC';
export const DEFAULT_CURRENCY = 'USD';

// Cache TTL: 24 hours (settings rarely change)
const CACHE_TTL_SECONDS = 24 * 60 * 60;

/**
 * Cached tenant settings structure
 */
export interface TenantSettings {
  timezone: string;
  currency: string;
}

/**
 * Get mutable cookie store (only works in server actions/route handlers)
 */
async function getMutableCookieStore() {
  const store = await cookies();
  const setFn = (store as any).set;
  const deleteFn = (store as any).delete;
  const isCallableGuard = (fn: unknown) => typeof fn === 'function' && fn.name === 'callable';
  const canMutate =
    typeof setFn === 'function' &&
    typeof deleteFn === 'function' &&
    !isCallableGuard(setFn) &&
    !isCallableGuard(deleteFn);

  return canMutate ? store : null;
}

/**
 * Read cached tenant settings from cookies
 */
export async function readTenantSettingsCache(): Promise<TenantSettings | null> {
  try {
    const store = await cookies();
    const timezone = store.get(TENANT_TIMEZONE_KEY)?.value;
    const currency = store.get(TENANT_CURRENCY_KEY)?.value;

    // Return null if either is missing (will trigger fresh fetch)
    if (!timezone || !currency) {
      return null;
    }

    return { timezone, currency };
  } catch {
    return null;
  }
}

/**
 * Write tenant settings to cookie cache
 */
export async function writeTenantSettingsCache(settings: TenantSettings): Promise<void> {
  const store = await getMutableCookieStore();
  if (!store) {
    return;
  }

  try {
    const cookieOptions = {
      path: '/',
      maxAge: CACHE_TTL_SECONDS,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    };

    (store as any).set({ name: TENANT_TIMEZONE_KEY, value: settings.timezone, ...cookieOptions });
    (store as any).set({ name: TENANT_CURRENCY_KEY, value: settings.currency, ...cookieOptions });
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Failed to write tenant settings cache', error);
    }
  }
}

/**
 * Clear tenant settings cache (called on logout)
 */
export async function clearTenantSettingsCache(): Promise<void> {
  const store = await getMutableCookieStore();
  if (!store) {
    return;
  }

  try {
    (store as any).delete(TENANT_TIMEZONE_KEY);
    (store as any).delete(TENANT_CURRENCY_KEY);
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Failed to clear tenant settings cache', error);
    }
  }
}

/**
 * Warm the tenant settings cache
 *
 * This should be called on login to fetch and cache settings.
 * Falls back to tenant subscription defaults if settings not configured.
 */
export async function warmTenantSettingsCache(): Promise<TenantSettings> {
  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const settingService = container.get<SettingService>(TYPES.SettingService);

    const tenant = await tenantService.getCurrentTenant();

    // Get configured settings from database
    const [configuredTimezone, configuredCurrency] = await Promise.all([
      settingService.getTenantTimezone(),
      settingService.getTenantCurrency(),
    ]);

    // Determine effective values with fallback chain:
    // 1. Configured setting
    // 2. Tenant subscription default (from registration/geolocation)
    // 3. System default
    const timezone = configuredTimezone || DEFAULT_TIMEZONE;
    const currency = configuredCurrency || tenant?.currency || DEFAULT_CURRENCY;

    const settings: TenantSettings = { timezone, currency };

    // Cache in cookies
    await writeTenantSettingsCache(settings);

    return settings;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Failed to warm tenant settings cache', error);
    }
    return { timezone: DEFAULT_TIMEZONE, currency: DEFAULT_CURRENCY };
  }
}

/**
 * Get tenant timezone with caching
 *
 * Checks cookie cache first, then falls back to database fetch.
 * This is the primary function used by datetime-utils.
 */
export async function getTenantTimezone(): Promise<string> {
  try {
    // Check cookie cache first
    const cached = await readTenantSettingsCache();
    if (cached?.timezone) {
      return cached.timezone;
    }

    // Cache miss - fetch from database
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const settingService = container.get<SettingService>(TYPES.SettingService);

    const [tenant, configuredTimezone] = await Promise.all([
      tenantService.getCurrentTenant(),
      settingService.getTenantTimezone(),
    ]);

    const timezone = configuredTimezone || DEFAULT_TIMEZONE;
    const currency = (await settingService.getTenantCurrency()) || tenant?.currency || DEFAULT_CURRENCY;

    // Try to update cache (may fail in read-only contexts)
    try {
      await writeTenantSettingsCache({ timezone, currency });
    } catch {
      // Ignore - cache will be warmed on next login
    }

    return timezone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Get tenant currency with caching
 *
 * Checks cookie cache first, then falls back to database fetch.
 * This is the primary function used by finance-utils.
 */
export async function getTenantCurrency(): Promise<string> {
  try {
    // Check cookie cache first
    const cached = await readTenantSettingsCache();
    if (cached?.currency) {
      return cached.currency;
    }

    // Cache miss - fetch from database
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const settingService = container.get<SettingService>(TYPES.SettingService);

    const [tenant, configuredCurrency] = await Promise.all([
      tenantService.getCurrentTenant(),
      settingService.getTenantCurrency(),
    ]);

    const currency = configuredCurrency || tenant?.currency || DEFAULT_CURRENCY;
    const timezone = (await settingService.getTenantTimezone()) || DEFAULT_TIMEZONE;

    // Try to update cache (may fail in read-only contexts)
    try {
      await writeTenantSettingsCache({ timezone, currency });
    } catch {
      // Ignore - cache will be warmed on next login
    }

    return currency;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

/**
 * Invalidate and refresh the tenant settings cache
 *
 * Call this when settings are updated to ensure fresh values.
 */
export async function refreshTenantSettingsCache(): Promise<TenantSettings> {
  await clearTenantSettingsCache();
  return warmTenantSettingsCache();
}
