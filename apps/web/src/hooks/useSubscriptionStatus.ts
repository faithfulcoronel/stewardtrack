'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

export interface SubscriptionStatus {
  isActive: boolean;
  isExpired: boolean;
  isInGracePeriod: boolean;
  subscriptionStatus: string | null;
  nextBillingDate: string | null;
  gracePeriodEndDate: Date | null;
  daysUntilExpiry: number | null;
}

interface SubscriptionResponse {
  tenant: {
    subscription_status: string;
    next_billing_date: string | null;
  };
}

const GRACE_PERIOD_DAYS = 7;

/**
 * Hook to check subscription status and determine if subscription is active/expired
 *
 * @returns SubscriptionStatus object with subscription state information
 */
export function useSubscriptionStatus(): {
  status: SubscriptionStatus;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/subscription/status');

      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }

      const data = await response.json();
      setSubscriptionData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      console.error('[useSubscriptionStatus] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const status = useMemo<SubscriptionStatus>(() => {
    if (!subscriptionData?.tenant) {
      return {
        isActive: false,
        isExpired: true,
        isInGracePeriod: false,
        subscriptionStatus: null,
        nextBillingDate: null,
        gracePeriodEndDate: null,
        daysUntilExpiry: null,
      };
    }

    const { subscription_status, next_billing_date } = subscriptionData.tenant;
    const now = new Date();
    //now.setDate(now.getDate() + 101); // IGNORE - simulate date in future for testing

    // Check for cancelled or inactive status
    const isCancelled = subscription_status === 'cancelled';
    const isActiveStatus = ['active', 'paid', 'trial'].includes(subscription_status?.toLowerCase() || '');

    // Calculate grace period end date
    let gracePeriodEndDate: Date | null = null;
    let isInGracePeriod = false;
    let isExpired = false;
    let daysUntilExpiry: number | null = null;

    if (next_billing_date) {
      const billingDate = new Date(next_billing_date);
      gracePeriodEndDate = new Date(billingDate);
      gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + GRACE_PERIOD_DAYS);

      // Check if in grace period (between billing date and grace period end)
      if (now > billingDate && now <= gracePeriodEndDate) {
        isInGracePeriod = true;
        const diffTime = gracePeriodEndDate.getTime() - now.getTime();
        daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // Check if expired (past grace period)
      if (now > gracePeriodEndDate) {
        isExpired = true;
      }
    } else {
      if(subscription_status?.toLowerCase() !== 'trial') {
        isExpired = true;
      }
    }

    // Subscription is active if:
    // 1. Status is active/paid/trial AND
    // 2. Not past grace period
    const isActive = isActiveStatus && !isExpired && !isCancelled;

    //  isExpired: isExpired || isCancelled,
    console.log('[useSubscriptionStatus] Computed Status:', {
      isActive,
      isExpired: isExpired,
      isInGracePeriod,
      subscriptionStatus: subscription_status,
      nextBillingDate: next_billing_date,
      gracePeriodEndDate,
      daysUntilExpiry,
    });
    return {
      isActive,
      isExpired: isExpired,
      isInGracePeriod,
      subscriptionStatus: subscription_status,
      nextBillingDate: next_billing_date,
      gracePeriodEndDate,
      daysUntilExpiry,
    };
  }, [subscriptionData]);

  return {
    status,
    isLoading,
    error,
    refetch: fetchStatus,
  };
}

/**
 * Check if subscription has expired (past grace period)
 * Pure function for server-side usage
 */
export function isSubscriptionExpired(
  subscriptionStatus: string | null,
  nextBillingDate: string | null
): boolean {
  if (!subscriptionStatus) return true;

  const isCancelled = subscriptionStatus === 'cancelled';
  const isActiveStatus = ['active', 'paid', 'trial'].includes(subscriptionStatus.toLowerCase());

  if (isCancelled || !isActiveStatus) return true;

  if (nextBillingDate) {
    const billingDate = new Date(nextBillingDate);
    const gracePeriodEnd = new Date(billingDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

    if (new Date() > gracePeriodEnd) {
      return true;
    }
  }
  // No billing date but status is active - not expired

  return false;
}
