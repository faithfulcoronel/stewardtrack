/**
 * RBAC Audit & Publishing Dashboard Page
 *
 * Operational monitoring for RBAC changes and metadata publishing status.
 *
 * SECURITY: Protected by AccessGate requiring rbac:manage permission.
 */

import { Metadata } from 'next';
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { RbacAuditDashboard } from '@/components/admin/rbac/RbacAuditDashboard';

export const metadata: Metadata = {
  title: 'RBAC Audit & Publishing Dashboard | StewardTrack',
  description: 'Operational dashboard for RBAC audit trails and metadata publishing oversight',
};

export default async function RbacAuditPage() {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission('rbac:manage', 'all', {
    fallbackPath: '/unauthorized?reason=rbac_manage_required',
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            RBAC Audit & Publishing Dashboard
          </h1>
          <p className="text-gray-600">
            Monitor RBAC changes, audit trails, and metadata publishing status for operational oversight
          </p>
        </div>

        <RbacAuditDashboard />
      </div>
    </ProtectedPage>
  );
}