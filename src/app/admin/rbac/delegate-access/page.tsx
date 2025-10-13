/**
 * Delegate Access Dashboard Page
 *
 * Workspace for delegating scoped administrative access.
 *
 * SECURITY: Protected by AccessGate allowing super admins, tenant admins, or rbac:manage permission.
 */

import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { DelegateAccessDashboard } from '@/components/admin/rbac/DelegateAccessDashboard';

export default async function DelegateAccessPage() {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.rbacAdmin({
    fallbackPath: '/unauthorized?reason=rbac_manage_required',
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <DelegateAccessDashboard />
    </ProtectedPage>
  );
}
