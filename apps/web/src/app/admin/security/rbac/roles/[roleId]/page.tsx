/**
 * ================================================================================
 * ROLE VIEW/EDIT PAGE
 * ================================================================================
 *
 * Full-page wizard for viewing or editing existing roles.
 *
 * SECURITY: Protected by AccessGate requiring rbac:roles_view or rbac:roles_edit permission.
 *
 * URL PATTERN:
 *   - /admin/security/rbac/roles/[roleId] - View role (default)
 *   - /admin/security/rbac/roles/[roleId]?mode=edit - Edit role
 *
 * ================================================================================
 */

import type { Metadata } from 'next';
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { RoleWizardClient } from './RoleWizardClient';

export const metadata: Metadata = {
  title: 'Role Details | RBAC | StewardTrack',
  description: 'View or edit role details and permissions',
};

interface PageProps {
  params: Promise<{ roleId: string }>;
  searchParams: Promise<{ mode?: string }>;
}

export default async function RoleDetailPage({ params, searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const { roleId } = await params;
  const { mode } = await searchParams;

  // Determine the mode based on query parameter
  const wizardMode = mode === 'edit' ? 'edit' : 'view';

  // Use appropriate gate based on mode
  const gate = wizardMode === 'edit'
    ? Gate.rbacAdmin({
        fallbackPath: '/unauthorized?reason=rbac_edit_required',
      })
    : Gate.withPermission(['rbac:roles_view', 'rbac:roles_edit'], 'any', {
        fallbackPath: '/unauthorized?reason=rbac_view_required',
      });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <RoleWizardClient roleId={roleId} mode={wizardMode} />
    </ProtectedPage>
  );
}
