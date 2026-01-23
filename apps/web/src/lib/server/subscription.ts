import 'server-only';
import { redirect } from 'next/navigation';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';

const GRACE_PERIOD_DAYS = 7;

export interface SubscriptionStatus {
  isActive: boolean;
  isExpired: boolean;
  isInGracePeriod: boolean;
  subscriptionStatus: string | null;
  nextBillingDate: string | null;
  gracePeriodEndDate: Date | null;
  daysUntilExpiry: number | null;
}

/**
 * Check subscription status for a tenant (server-side)
 */
export async function getSubscriptionStatus(tenantId: string): Promise<SubscriptionStatus> {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.findById(tenantId);

  if (!tenant) {
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

  const subscriptionStatus = tenant.subscription_status;
  const nextBillingDate = tenant.next_billing_date;
  const now = new Date();

  // Check for cancelled or inactive status
  const isCancelled = subscriptionStatus === 'cancelled';
  const isActiveStatus = ['active', 'paid', 'trial'].includes(subscriptionStatus?.toLowerCase() || '');

  // Calculate grace period end date
  let gracePeriodEndDate: Date | null = null;
  let isInGracePeriod = false;
  let isExpired = false;
  let daysUntilExpiry: number | null = null;

  if (nextBillingDate) {
    const billingDate = new Date(nextBillingDate);
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
  }
  else {
    if(subscriptionStatus?.toLowerCase() !== 'trial') {
      isExpired = true;
    }
  }

  // Subscription is active if:
  // 1. Status is active/paid/trial AND
  // 2. Not past grace period
  const isActive = isActiveStatus && !isExpired && !isCancelled;

  return {
    isActive,
    isExpired: isExpired || isCancelled,
    isInGracePeriod,
    subscriptionStatus,
    nextBillingDate,
    gracePeriodEndDate,
    daysUntilExpiry,
  };
}

/**
 * Check if subscription is expired and redirect if so
 */
export async function requireActiveSubscription(
  tenantId: string,
  redirectTo: string = '/subscription-expired'
): Promise<SubscriptionStatus> {
  const status = await getSubscriptionStatus(tenantId);

  if (status.isExpired) {
    redirect(redirectTo);
  }

  return status;
}

/**
 * Check subscription without redirecting
 */
export async function checkSubscription(tenantId: string): Promise<{
  allowed: boolean;
  status: SubscriptionStatus;
}> {
  const status = await getSubscriptionStatus(tenantId);

  return {
    allowed: !status.isExpired,
    status,
  };
}
