/**
 * Account Manage Page
 *
 * Create or edit an account in the chart of accounts.
 *
 * SECURITY: Protected by AccessGate requiring finance:write permission.
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
  title: 'Manage Account | StewardTrack',
};

export default async function AccountManagePage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(['finance:write'], 'any', {
    fallbackPath: '/unauthorized?reason=finance_write_access',
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderFinancePage('accounts/manage', resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
