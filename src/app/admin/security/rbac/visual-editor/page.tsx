/**
 * RBAC Visual Binding Editor Page
 *
 * Interactive tool for mapping roles, surfaces, and feature licenses.
 *
 * SECURITY: Protected by AccessGate allowing super admins, tenant admins, or rbac:manage permission.
 */

import { Metadata } from 'next';
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { VisualBindingEditor } from '@/components/admin/rbac/VisualBindingEditor';

export const metadata: Metadata = {
  title: 'Visual Binding Editor | StewardTrack',
  description: 'Create and manage connections between UI surfaces, roles, bundles, and feature licenses',
};

export default async function VisualEditorPage() {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.rbacAdmin({
    fallbackPath: '/unauthorized?reason=rbac_manage_required',
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="container mx-auto px-4 py-6">
        <VisualBindingEditor />
      </div>
    </ProtectedPage>
  );
}
