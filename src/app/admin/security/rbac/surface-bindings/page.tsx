/**
 * Surface Binding Manager Page
 *
 * Administration interface for linking surfaces to roles, bundles, and licenses.
 *
 * SECURITY: Protected by AccessGate allowing super admins, tenant admins, or rbac:manage permission.
 */

import { Metadata } from 'next';
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { SurfaceBindingManager } from '@/components/admin/rbac/SurfaceBindingManager';

export const metadata: Metadata = {
  title: 'Surface Binding Manager | StewardTrack',
  description: 'Manage metadata surface connections to roles, bundles, and feature licensing',
};

export default async function SurfaceBindingsPage() {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.rbacAdmin({
    fallbackPath: '/unauthorized?reason=rbac_manage_required',
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="container mx-auto px-4 py-6">
        <SurfaceBindingManager />
      </div>
    </ProtectedPage>
  );
}
