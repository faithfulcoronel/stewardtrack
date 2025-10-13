/**
 * Permission Bundle Composer Page
 *
 * Wizard for crafting reusable RBAC permission bundles.
 *
 * SECURITY: Protected by AccessGate allowing super admins, tenant admins, or rbac:manage permission.
 */

import { Metadata } from 'next';
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { BundleComposer } from '@/components/admin/rbac/BundleComposer';

export const metadata: Metadata = {
  title: 'Permission Bundle Composer | RBAC | StewardTrack',
  description: 'Create and manage reusable permission bundles with guided composition wizard',
};

export default async function BundleComposerPage() {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.rbacAdmin({
    fallbackPath: '/unauthorized?reason=rbac_manage_required',
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Permission Bundle Composer</h1>
          <p className="text-gray-600">
            Create reusable permission sets using our guided composition wizard, tailored for different church sizes and ministry structures
          </p>
        </div>

        <BundleComposer />
      </div>
    </ProtectedPage>
  );
}
