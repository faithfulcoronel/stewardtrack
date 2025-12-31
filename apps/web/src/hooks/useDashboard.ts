'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AdminDashboardData } from '@/models/dashboard/adminDashboard.model';

interface UseDashboardResult {
  data: AdminDashboardData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  refreshBibleVerse: () => Promise<void>;
  isRefreshingVerse: boolean;
}

interface DashboardApiResponse {
  success: boolean;
  data?: AdminDashboardData;
  error?: string;
  details?: string;
  timestamp: string;
}

export function useDashboard(): UseDashboardResult {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshingVerse, setIsRefreshingVerse] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/dashboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result: DashboardApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.details || 'Failed to fetch dashboard data');
      }

      if (result.data) {
        setData(result.data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      console.error('[useDashboard] Error fetching dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshBibleVerse = useCallback(async () => {
    if (isRefreshingVerse) return;

    try {
      setIsRefreshingVerse(true);

      // Fetch only the bible verse endpoint
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
      console.error('[useDashboard] Error refreshing bible verse:', err);
      // Don't set error state for verse refresh - just log it
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
    refetch: fetchDashboard,
    refreshBibleVerse,
    isRefreshingVerse,
  };
}
