/**
 * Request-Level Auth Cache
 *
 * This module provides request-scoped caching for authentication data to prevent
 * redundant Supabase Auth API calls that can trigger rate limiting (429 errors).
 *
 * PROBLEM SOLVED:
 * - Multiple adapters/services calling getUser() independently per request
 * - Each getUser() call hits Supabase Auth API
 * - With 10+ calls per request, rate limits are quickly exceeded
 *
 * SOLUTION:
 * - Uses React's cache() for automatic request deduplication in Next.js
 * - First call fetches from Supabase, subsequent calls return cached result
 * - Cache is automatically invalidated at request boundary
 *
 * SECURITY:
 * - Uses getUser() (server-side verification) not getSession() (client JWT only)
 * - Each request gets fresh data - no stale auth across requests
 * - No persistent cache that could leak between users
 */

import 'server-only';
import { cache } from 'react';
import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface CachedAuthData {
  user: User | null;
  userId: string | null;
  error: Error | null;
}

export interface CachedAdminRole {
  role: 'super_admin' | 'tenant_admin' | 'staff' | 'member' | null;
  error: Error | null;
}

/**
 * Get authenticated user with request-level caching.
 * This function is deduplicated per request using React's cache().
 *
 * @returns Promise<CachedAuthData> - Cached user data or error
 */
export const getCachedUser = cache(async (): Promise<CachedAuthData> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      // Don't log expected errors:
      // - 429: Rate limit errors during high load
      // - "Auth session missing!": Expected on public routes where user isn't authenticated
      const isExpectedError = error.status === 429 || error.message === 'Auth session missing!';
      if (!isExpectedError) {
        console.error('[AuthCache] getUser error:', error.message);
      }
      return { user: null, userId: null, error };
    }

    return {
      user: data.user,
      userId: data.user?.id ?? null,
      error: null,
    };
  } catch (error) {
    console.error('[AuthCache] Unexpected error:', error);
    return {
      user: null,
      userId: null,
      error: error instanceof Error ? error : new Error('Unknown auth error'),
    };
  }
});

/**
 * Get user's admin role with request-level caching.
 * Uses the centralized get_user_admin_role RPC function.
 *
 * @returns Promise<CachedAdminRole> - Cached admin role or error
 */
export const getCachedAdminRole = cache(async (): Promise<CachedAdminRole> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('get_user_admin_role');

    if (error) {
      // Don't log rate limit errors
      if ((error as any).status !== 429) {
        console.error('[AuthCache] get_user_admin_role RPC error:', error.message);
      }
      return { role: null, error };
    }

    return {
      role: data as 'super_admin' | 'tenant_admin' | 'staff' | 'member' | null,
      error: null,
    };
  } catch (error) {
    console.error('[AuthCache] Unexpected admin role error:', error);
    return {
      role: null,
      error: error instanceof Error ? error : new Error('Unknown admin role error'),
    };
  }
});

/**
 * Quick helper to get just the user ID (most common use case).
 * Returns undefined if not authenticated (matches existing adapter behavior).
 */
export async function getCachedUserId(): Promise<string | undefined> {
  const { userId } = await getCachedUser();
  return userId ?? undefined;
}

/**
 * Quick helper to check if current user is a super admin.
 */
export async function isCachedSuperAdmin(): Promise<boolean> {
  const { role } = await getCachedAdminRole();
  return role === 'super_admin';
}

/**
 * Quick helper to check if current user is a tenant admin.
 */
export async function isCachedTenantAdmin(): Promise<boolean> {
  const { role } = await getCachedAdminRole();
  return role === 'tenant_admin';
}
