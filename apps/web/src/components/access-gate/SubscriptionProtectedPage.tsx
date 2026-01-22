/**
 * SubscriptionProtectedPage Component
 *
 * Server-side subscription access control for Next.js pages.
 * Redirects to subscription-expired page if subscription is expired (past grace period).
 */

import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSubscriptionStatus } from '@/lib/server/subscription';

interface SubscriptionProtectedPageProps {
  // Tenant ID to check subscription for
  tenantId: string;

  // Content to render if subscription is active
  children: ReactNode;

  // Custom redirect path on subscription expired (defaults to /subscription-expired)
  redirectTo?: string;

  // Feature name for context (optional, can be used in redirect query params)
  featureName?: string;
}

/**
 * SubscriptionProtectedPage - Server component for protecting pages that require active subscription
 *
 * @example
 * export default async function FinanceDashboardPage() {
 *   const tenantId = await getCurrentTenantId();
 *
 *   return (
 *     <SubscriptionProtectedPage tenantId={tenantId} featureName="Finance">
 *       <FinanceDashboard />
 *     </SubscriptionProtectedPage>
 *   );
 * }
 */
export async function SubscriptionProtectedPage({
  tenantId,
  children,
  redirectTo = '/subscription-expired',
  featureName,
}: SubscriptionProtectedPageProps) {
  const status = await getSubscriptionStatus(tenantId);

  if (status.isExpired) {
    const url = featureName
      ? `${redirectTo}?feature=${encodeURIComponent(featureName)}`
      : redirectTo;
    redirect(url);
  }

  return <>{children}</>;
}
