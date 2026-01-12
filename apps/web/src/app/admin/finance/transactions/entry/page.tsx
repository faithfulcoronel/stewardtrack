/**
 * Transaction Entry Page
 *
 * Record income or expense transactions.
 *
 * SECURITY: Protected by AccessGate requiring finance:create permission.
 */

import type { Metadata } from 'next';
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';

import { renderFinancePage, type PageSearchParams } from '../../metadata';

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: 'Record Transaction | StewardTrack',
};

export default async function TransactionEntryPage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(['finance:create'], 'any', {
    fallbackPath: '/unauthorized?reason=finance_create_access',
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderFinancePage('transactions/entry', resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
