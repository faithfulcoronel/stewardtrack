'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PersonaDashboardData } from '@/models/dashboard/adminDashboard.model';

interface UsePersonaDashboardResult {
  data: PersonaDashboardData | null;
  isLoading: boolean;
  error: string | null;
  userRoles: string[];
  timezone: string;
  refetch: () => Promise<void>;
  refreshBibleVerse: () => Promise<void>;
  isRefreshingVerse: boolean;
}

interface PersonaDashboardApiResponse {
  success: boolean;
  data?: PersonaDashboardData;
  userRoles?: string[];
  timezone?: string;
  error?: string;
  details?: string;
  timestamp: string;
}

/**
 * Persona-Based Dashboard Hook
 *
 * Extends the base dashboard functionality with user roles for persona-based rendering.
 * Fetches dashboard data and user roles in a single API call for efficiency.
 */
export function usePersonaDashboard(): UsePersonaDashboardResult {
  const [data, setData] = useState<PersonaDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [timezone, setTimezone] = useState<string>('UTC');
  const [isRefreshingVerse, setIsRefreshingVerse] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/dashboard/persona', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result: PersonaDashboardApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.details || 'Failed to fetch dashboard data');
      }

      if (result.data) {
        setData(result.data);
      }

      if (result.userRoles) {
        setUserRoles(result.userRoles);
      }

      if (result.timezone) {
        setTimezone(result.timezone);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      console.error('[usePersonaDashboard] Error fetching dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshBibleVerse = useCallback(async () => {
    if (isRefreshingVerse) return;

    try {
      setIsRefreshingVerse(true);

      const response = await fetch('/api/admin/dashboard/bible-verse', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch bible verse');
      }

      if (result.data && data) {
        setData({
          ...data,
          bibleVerse: result.data,
        });
      }
    } catch (err) {
      console.error('[usePersonaDashboard] Error refreshing bible verse:', err);
    } finally {
      setIsRefreshingVerse(false);
    }
  }, [data, isRefreshingVerse]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    data,
    isLoading,
    error,
    userRoles,
    timezone,
    refetch: fetchDashboard,
    refreshBibleVerse,
    isRefreshingVerse,
  };
}
