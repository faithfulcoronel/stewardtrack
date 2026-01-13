/**
 * Fund Profile Page
 *
 * View details of a specific fund.
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
  params: Awaitable<{ fundId: string }>;
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: 'Fund Details | StewardTrack',
};

export default async function FundProfilePage({ params, searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(['finance:view'], 'any', {
    fallbackPath: '/unauthorized?reason=finance_access',
  });

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderFinancePage('funds/profile', {
    ...resolvedSearchParams,
    fundId: resolvedParams.fundId,
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
