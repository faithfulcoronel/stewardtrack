'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PaymentMethodType } from '@/models/donation.model';

export interface SavedPaymentMethod {
  id: string;
  payment_type: PaymentMethodType;
  display_name: string;
  masked_account: string | null;
  channel_code: string | null;
  is_default: boolean;
  nickname: string | null;
  icon: string;
}

interface UseSavedPaymentMethodsResult {
  paymentMethods: SavedPaymentMethod[];
  defaultMethod: SavedPaymentMethod | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch saved payment methods for the current logged-in member.
 * Returns empty array if user is not authenticated or not a member.
 */
export function useSavedPaymentMethods(): UseSavedPaymentMethodsResult {
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/members/me/payment-methods');

      // If unauthorized, user is not logged in or not a member
      if (response.status === 401 || response.status === 404) {
        setIsAuthenticated(false);
        setPaymentMethods([]);
        return;
      }

      const result = await response.json();

      if (result.success && result.data) {
        setIsAuthenticated(true);
        setPaymentMethods(result.data);
      } else {
        // User might be authenticated but API returned error
        setIsAuthenticated(false);
        setPaymentMethods([]);
      }
    } catch (err) {
      console.error('Error fetching saved payment methods:', err);
      setError('Failed to load saved payment methods');
      setIsAuthenticated(false);
      setPaymentMethods([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const defaultMethod = paymentMethods.find((pm) => pm.is_default) || null;

  return {
    paymentMethods,
    defaultMethod,
    isLoading,
    error,
    isAuthenticated,
    refetch: fetchPaymentMethods,
  };
}
