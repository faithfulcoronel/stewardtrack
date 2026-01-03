/**
 * Multi-Role Assignment Page
 *
 * Tooling for assigning multiple roles with conflict analysis.
 * Requires rbac.multi_role feature (Enterprise tier).
 *
 * SECURITY: Protected by AccessGate allowing super admins, tenant admins, or users with
 * rbac:multi_role_assign permission (from rbac.multi_role feature).
 */

import { Metadata } from 'next';
import { Gate, any } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { MultiRoleAssignment } from '@/components/admin/rbac/MultiRoleAssignment';

export const metadata: Metadata = {
  title: 'Multi-Role Assignment | RBAC Management',
  description: 'Assign multiple roles to volunteers with conflict analysis and resolution'
};

export default async function MultiRolePage() {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  // Require both rbac.multi_role feature (Enterprise tier) AND permission
  const gate = any(
    Gate.superAdminOnly(),
    Gate.tenantAdminOnly(),
    Gate.withPermission('rbac:multi_role_assign', 'all', {
      fallbackPath: '/unauthorized?reason=multi_role_required',
    })
  );

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="container mx-auto py-6">
        <MultiRoleAssignment />
      </div>
    </ProtectedPage>
  );
}
