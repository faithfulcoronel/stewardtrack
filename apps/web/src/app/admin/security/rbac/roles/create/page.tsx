/**
 * ================================================================================
 * ROLE CREATION WIZARD PAGE
 * ================================================================================
 *
 * Full-page wizard for creating new roles with permission assignment.
 *
 * SECURITY: Protected by AccessGate requiring rbac:roles_edit permission.
 *
 * WIZARD STEPS:
 *   1. Basic Info - Role name, description, scope, delegatable setting
 *   2. Permissions - Select and assign permissions to the role
 *   3. Review - Review configuration and create the role
 *
 * ================================================================================
 */

import type { Metadata } from 'next';
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { RoleWizard } from '@/components/admin/rbac/wizard/RoleWizard';

export const metadata: Metadata = {
  title: 'Create Role | RBAC | StewardTrack',
  description: 'Create a new role with permission assignments',
};

export default async function CreateRolePage() {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();

  const gate = Gate.rbacAdmin({
    fallbackPath: '/unauthorized?reason=rbac_manage_required',
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <RoleWizard mode="create" />
    </ProtectedPage>
  );
}
