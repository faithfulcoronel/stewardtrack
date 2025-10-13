/**
 * Multi-Role Assignment Page
 *
 * Tooling for assigning multiple roles with conflict analysis.
 *
 * SECURITY: Protected by AccessGate requiring rbac:manage permission.
 */

import { Metadata } from 'next';
import { Gate } from '@/lib/access-gate';
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
  const gate = Gate.withPermission('rbac:manage', 'all', {
    fallbackPath: '/unauthorized?reason=rbac_manage_required',
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="container mx-auto py-6">
        <MultiRoleAssignment />
      </div>
    </ProtectedPage>
  );
}