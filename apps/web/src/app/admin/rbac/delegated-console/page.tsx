/**
 * Delegated RBAC Console Page
 *
 * Scoped console for campus and ministry leaders to manage access.
 * Requires rbac.delegation feature (Enterprise tier).
 *
 * SECURITY: Protected by AccessGate allowing super admins, tenant admins, or users with
 * rbac:delegate_view permission (from rbac.delegation feature).
 */

import { Metadata } from 'next';
import { Gate, any } from '@/lib/access-gate';
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
  const gate = any(
    Gate.superAdminOnly(),
    Gate.tenantAdminOnly(),
    Gate.withPermission('rbac:delegate_view', 'all', {
      fallbackPath: '/unauthorized?reason=delegation_view_required',
    })
  );

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="container mx-auto py-6">
        <DelegatedConsole />
      </div>
    </ProtectedPage>
  );
}
