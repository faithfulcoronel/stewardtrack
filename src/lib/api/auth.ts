/**
 * API Authentication Utilities
 *
 * Reusable functions for authenticating API requests
 */

import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

/**
 * Result of authentication check
 */
export interface AuthResult {
  user: User;
  error: null;
}

export interface AuthError {
  user: null;
  error: NextResponse;
}

export type AuthCheckResult = AuthResult | AuthError;

/**
 * Get authenticated user from request
 * Returns user if authenticated, or error response if not
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   const auth = await getAuthenticatedUser();
 *   if (auth.error) return auth.error;
 *
 *   const { user } = auth;
 *   // ... use user.id
 * }
 */
export async function getAuthenticatedUser(): Promise<AuthCheckResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        user: null,
        error: NextResponse.json(
          {
            success: false,
            error: 'Unauthorized - Authentication required'
          },
          { status: 401 }
        )
      };
    }

    return { user, error: null };
  } catch (err) {
    console.error('Authentication error:', err);
    return {
      user: null,
      error: NextResponse.json(
        {
          success: false,
          error: 'Authentication failed'
        },
        { status: 401 }
      )
    };
  }
}

/**
 * Require authentication - throws if not authenticated
 * Use this when you want to throw an error instead of returning early
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   const user = await requireAuth();
 *   // user is guaranteed to exist here
 * }
 */
export async function requireAuth(): Promise<User> {
  const auth = await getAuthenticatedUser();
  if (auth.error) {
    throw new Error('Unauthorized');
  }
  return auth.user;
}

/**
 * Get user ID from request (convenience function)
 * Returns null if not authenticated
 *
 * @example
 * const userId = await getUserId();
 * if (!userId) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * }
 */
export async function getUserId(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}
