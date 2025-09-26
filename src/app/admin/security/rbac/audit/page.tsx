import { Metadata } from 'next';
import { RbacAuditDashboard } from '@/components/admin/rbac/RbacAuditDashboard';

export const metadata: Metadata = {
  title: 'RBAC Audit & Publishing Dashboard | StewardTrack',
  description: 'Operational dashboard for RBAC audit trails and metadata publishing oversight',
};

export default function RbacAuditPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          RBAC Audit & Publishing Dashboard
        </h1>
        <p className="text-gray-600">
          Monitor RBAC changes, audit trails, and metadata publishing status for operational oversight
        </p>
      </div>

      <RbacAuditDashboard />
    </div>
  );
}