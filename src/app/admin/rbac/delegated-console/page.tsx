/**
 * Delegated RBAC Console Page
 *
 * Scoped console for campus and ministry leaders to manage access.
 *
 * SECURITY: Protected by AccessGate requiring rbac:manage permission.
 */

import { Metadata } from 'next';
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { DelegatedConsole } from '@/components/admin/rbac/DelegatedConsole';

export const metadata: Metadata = {
  title: 'Delegated Console | RBAC Management',
  description: 'Campus and ministry-scoped delegated RBAC console for managing volunteer access'
};

export default async function DelegatedConsolePage() {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission('rbac:manage', 'all', {
    fallbackPath: '/unauthorized?reason=rbac_manage_required',
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="container mx-auto py-6">
        <DelegatedConsole />
      </div>
    </ProtectedPage>
  );
}