/**
 * Delegation Permissions Management Page
 *
 * Configure delegation rules and access control policies.
 *
 * SECURITY: Protected by AccessGate allowing super admins, tenant admins, or rbac:manage permission.
 */

import { Metadata } from 'next';
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { DelegationPermissionManager } from '@/components/admin/rbac/DelegationPermissionManager';

export const metadata: Metadata = {
  title: 'Delegation Permissions | RBAC Management',
  description: 'Manage delegation permissions and access controls'
};

export default async function DelegationPermissionsPage() {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.rbacAdmin({
    fallbackPath: '/unauthorized?reason=rbac_manage_required',
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="container mx-auto py-6">
        <DelegationPermissionManager />
      </div>
    </ProtectedPage>
  );
}
