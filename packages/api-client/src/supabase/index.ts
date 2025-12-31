/**
 * Supabase client utilities for cross-platform use
 */

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Storage adapter interface for cross-platform token storage
 */
export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
}

/**
 * Default web storage adapter using localStorage
 */
export const webStorageAdapter: StorageAdapter = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
};

/**
 * Configuration for creating a Supabase client
 */
export interface SupabaseClientConfig {
  /** Supabase project URL */
  url: string;
  /** Supabase anonymous key */
  anonKey: string;
  /** Custom storage adapter (optional, defaults to localStorage) */
  storage?: StorageAdapter;
  /** Storage key for auth tokens */
  storageKey?: string;
}

/**
 * Create a Supabase browser client with optional custom storage
 * This allows for cross-platform token storage (web localStorage, Capacitor Preferences, etc.)
 */
export function createClient(config: SupabaseClientConfig): SupabaseClient {
  const { url, anonKey, storage = webStorageAdapter, storageKey = 'stewardtrack-auth' } = config;

  return createBrowserClient(url, anonKey, {
    auth: {
      storage: {
        getItem: async (key: string) => {
          const result = storage.getItem(key);
          return result instanceof Promise ? await result : result;
        },
        setItem: async (key: string, value: string) => {
          const result = storage.setItem(key, value);
          if (result instanceof Promise) await result;
        },
        removeItem: async (key: string) => {
          const result = storage.removeItem(key);
          if (result instanceof Promise) await result;
        },
      },
      storageKey,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

/**
 * Get environment variables for Supabase configuration
 * Works in both browser and Node.js environments
 */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  return { url, anonKey };
}

/**
 * Create a default Supabase client using environment variables
 */
export function createDefaultClient(storage?: StorageAdapter): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();
  return createClient({ url, anonKey, storage });
}

// Re-export types from Supabase for convenience
export type { SupabaseClient } from '@supabase/supabase-js';
export type { Session, User, AuthError } from '@supabase/supabase-js';
