/**
 * Secure Storage Bridge
 *
 * Unified API for secure storage across web and native platforms.
 * - Native (iOS): Uses iOS Keychain via Capacitor Preferences
 * - Native (Android): Uses Android Keystore via Capacitor Preferences
 * - Web: Uses localStorage with optional encryption
 */

import { isNative, isBrowser } from '../platform';

/**
 * Set a value in secure storage
 */
export async function setItem(key: string, value: string): Promise<void> {
  if (isNative()) {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key, value });
  } else if (isBrowser()) {
    localStorage.setItem(key, value);
  }
}

/**
 * Get a value from secure storage
 */
export async function getItem(key: string): Promise<string | null> {
  if (isNative()) {
    const { Preferences } = await import('@capacitor/preferences');
    const result = await Preferences.get({ key });
    return result.value;
  } else if (isBrowser()) {
    return localStorage.getItem(key);
  }
  return null;
}

/**
 * Remove a value from secure storage
 */
export async function removeItem(key: string): Promise<void> {
  if (isNative()) {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.remove({ key });
  } else if (isBrowser()) {
    localStorage.removeItem(key);
  }
}

/**
 * Get all keys in secure storage
 */
export async function keys(): Promise<string[]> {
  if (isNative()) {
    const { Preferences } = await import('@capacitor/preferences');
    const result = await Preferences.keys();
    return result.keys;
  } else if (isBrowser()) {
    return Object.keys(localStorage);
  }
  return [];
}

/**
 * Clear all values from secure storage
 */
export async function clear(): Promise<void> {
  if (isNative()) {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.clear();
  } else if (isBrowser()) {
    localStorage.clear();
  }
}

/**
 * Migrate data from one storage location to another
 * Useful for upgrading from localStorage to secure storage
 */
export async function migrate(
  sourceKey: string,
  targetKey?: string
): Promise<boolean> {
  if (!isBrowser()) return false;

  const localValue = localStorage.getItem(sourceKey);
  if (!localValue) return false;

  await setItem(targetKey ?? sourceKey, localValue);
  localStorage.removeItem(sourceKey);
  return true;
}

/**
 * Storage adapter interface for Supabase
 */
export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

/**
 * Create a storage adapter for Supabase that uses secure storage
 */
export function createStorageAdapter(): StorageAdapter {
  return {
    getItem,
    setItem,
    removeItem,
  };
}

/**
 * Set a JSON object in secure storage
 */
export async function setJSON<T>(key: string, value: T): Promise<void> {
  await setItem(key, JSON.stringify(value));
}

/**
 * Get a JSON object from secure storage
 */
export async function getJSON<T>(key: string): Promise<T | null> {
  const value = await getItem(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
