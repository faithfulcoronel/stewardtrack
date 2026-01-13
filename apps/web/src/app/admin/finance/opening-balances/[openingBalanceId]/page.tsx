/**
 * Opening Balance Profile Page
 *
 * View details of a specific opening balance.
 *
 * SECURITY: Protected by AccessGate requiring finance:view permission.
 */

import type { Metadata } from 'next';
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';

import { renderFinancePage, type PageSearchParams } from '../../metadata';

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  params: Awaitable<{ openingBalanceId: string }>;
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: 'Opening Balance Details | StewardTrack',
};

export default async function OpeningBalanceProfilePage({ params, searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(['finance:view'], 'any', {
    fallbackPath: '/unauthorized?reason=finance_access',
  });

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderFinancePage('opening-balances/profile', {
    ...resolvedSearchParams,
    openingBalanceId: resolvedParams.openingBalanceId,
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
