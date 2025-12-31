/**
 * RBAC Command Center Page
 *
 * Central hub for managing roles, permissions, and access control.
 *
 * SECURITY: Protected by AccessGate allowing super admins, tenant admins, or rbac:manage permission.
 */

import { Metadata } from 'next';
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { RbacDashboard } from '@/components/admin/rbac/RbacDashboard';

export const metadata: Metadata = {
  title: 'RBAC Command Center | StewardTrack',
  description: 'Manage roles, permissions, and access control for your church management system',
};

export default async function RbacDashboardPage() {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.rbacAdmin({
    fallbackPath: '/unauthorized?reason=rbac_manage_required',
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="container mx-auto px-4 py-6">
        <RbacDashboard />
      </div>
    </ProtectedPage>
  );
}
