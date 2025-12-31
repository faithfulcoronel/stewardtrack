/**
 * RBAC Role Explorer Page
 *
 * Provides tools for managing roles, bundles, and permission hierarchies.
 *
 * SECURITY: Protected by AccessGate allowing super admins, tenant admins, or rbac:manage permission.
 */

import { Metadata } from 'next';
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { RoleExplorer } from '@/components/admin/rbac/RoleExplorer';

export const metadata: Metadata = {
  title: 'Role & Bundle Explorer | RBAC | StewardTrack',
  description: 'Explore and manage roles, permission bundles, and access patterns',
};

export default async function RoleExplorerPage() {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.rbacAdmin({
    fallbackPath: '/unauthorized?reason=rbac_manage_required',
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Role & Bundle Explorer</h1>
          <p className="text-gray-600">
            Browse, create, and manage roles and permission bundles for comprehensive access control
          </p>
        </div>

        <RoleExplorer />
      </div>
    </ProtectedPage>
  );
}
