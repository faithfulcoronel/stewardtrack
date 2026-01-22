/**
 * Finance Module Layout
 *
 * Wraps all finance pages with subscription protection.
 * Finance is a pro feature that requires an active subscription.
 */

import { ReactNode } from 'react';
import { SubscriptionProtectedPage } from '@/components/access-gate';
import { getCurrentTenantId } from '@/lib/server/context';

interface FinanceLayoutProps {
  children: ReactNode;
}

export default async function FinanceLayout({ children }: FinanceLayoutProps) {
  const tenantId = await getCurrentTenantId();

  return (
    <SubscriptionProtectedPage tenantId={tenantId} featureName="Finance">
      {children}
    </SubscriptionProtectedPage>
  );
}
