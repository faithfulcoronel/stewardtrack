/**
 * React hooks for API client
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';

/**
 * Hook to get the current Supabase session
 */
export function useSession(client: SupabaseClient) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Get initial session
    client.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setError(error);
      } else {
        setSession(session);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [client]);

  return { session, loading, error };
}

/**
 * Hook to get the current user
 */
export function useUser(client: SupabaseClient) {
  const { session, loading, error } = useSession(client);
  return {
    user: session?.user ?? null,
    loading,
    error,
  };
}

/**
 * Hook for authentication actions
 */
export function useAuth(client: SupabaseClient) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  const signUp = useCallback(
    async (email: string, password: string, metadata?: Record<string, unknown>) => {
      setLoading(true);
      setError(null);
      try {
        const { error } = await client.auth.signUp({
          email,
          password,
          options: { data: metadata },
        });
        if (error) throw error;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const resetPassword = useCallback(
    async (email: string) => {
      setLoading(true);
      setError(null);
      try {
        const { error } = await client.auth.resetPasswordForEmail(email);
        if (error) throw error;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  return {
    signIn,
    signUp,
    signOut,
    resetPassword,
    loading,
    error,
  };
}

/**
 * Generic data fetching hook
 */
export function useQuery<T>(
  client: SupabaseClient,
  table: string,
  options?: {
    select?: string;
    filter?: Record<string, unknown>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  }
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = client.from(table).select(options?.select ?? '*');

      if (options?.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      if (options?.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true,
        });
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      setData(data as T[]);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [client, table, options?.select, options?.filter, options?.orderBy, options?.limit]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
