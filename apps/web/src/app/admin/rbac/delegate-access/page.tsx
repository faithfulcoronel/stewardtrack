/**
 * Delegate Access Dashboard Page
 *
 * Workspace for delegating scoped administrative access.
 * Requires rbac.delegation feature (Enterprise tier).
 *
 * SECURITY: Protected by AccessGate allowing super admins, tenant admins, or users with
 * rbac:delegate permission (from rbac.delegation feature).
 */

import { Gate, any } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { DelegateAccessDashboard } from '@/components/admin/rbac/DelegateAccessDashboard';

export default async function DelegateAccessPage() {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = any(
    Gate.superAdminOnly(),
    Gate.tenantAdminOnly(),
    Gate.withPermission('rbac:delegate', 'all', {
      fallbackPath: '/unauthorized?reason=delegation_required',
    })
  );

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <DelegateAccessDashboard />
    </ProtectedPage>
  );
}
