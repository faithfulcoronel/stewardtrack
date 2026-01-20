/**
 * Donation Profile Page
 *
 * Display detailed information about a specific donation.
 *
 * SECURITY: Protected by AccessGate requiring donations:view permission.
 */

import type { Metadata } from 'next';
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';

import { renderFinancePage, type PageSearchParams } from '../../metadata';

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  params: Awaitable<{ donationId: string }>;
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: 'Donation Details | StewardTrack',
};

export default async function DonationProfilePage({ params, searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(['members:view'], 'any', {
    fallbackPath: '/unauthorized?reason=donations_access',
  });

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderFinancePage('donations/profile', {
    ...resolvedSearchParams,
    donationId: resolvedParams.donationId,
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
