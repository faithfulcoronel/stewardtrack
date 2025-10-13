/**
 * Advanced Permission Mapper Page
 *
 * Visualization workspace for complex RBAC relationships.
 *
 * SECURITY: Protected by AccessGate allowing super admins, tenant admins, or rbac:manage permission.
 */

import { Metadata } from 'next';
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { AdvancedPermissionMapper } from '@/components/admin/rbac/AdvancedPermissionMapper';

export const metadata: Metadata = {
  title: 'Advanced Permission Mapper | StewardTrack',
  description: 'Visualize and manage complex permission relationships across roles, bundles, and surfaces',
};

export default async function PermissionMapperPage() {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.rbacAdmin({
    fallbackPath: '/unauthorized?reason=rbac_manage_required',
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="container mx-auto px-4 py-6">
        <AdvancedPermissionMapper />
      </div>
    </ProtectedPage>
  );
}
