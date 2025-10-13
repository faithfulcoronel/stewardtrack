/**
 * Metadata Publishing Controls Page
 *
 * Operational dashboard for RBAC metadata compilation and distribution.
 *
 * SECURITY: Protected by AccessGate allowing super admins, tenant admins, or rbac:manage permission.
 */

import { Metadata } from 'next';
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { MetadataPublishingControls } from '@/components/admin/rbac/MetadataPublishingControls';

export const metadata: Metadata = {
  title: 'Metadata Publishing Controls | StewardTrack',
  description: 'Monitor and control RBAC metadata compilation and distribution across tenants',
};

export default async function PublishingPage() {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.rbacAdmin({
    fallbackPath: '/unauthorized?reason=rbac_manage_required',
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="container mx-auto px-4 py-6">
        <MetadataPublishingControls />
      </div>
    </ProtectedPage>
  );
}
