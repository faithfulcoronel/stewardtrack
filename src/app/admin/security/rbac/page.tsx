import { Metadata } from 'next';
import { RbacDashboard } from '@/components/admin/rbac/RbacDashboard';

export const metadata: Metadata = {
  title: 'RBAC Command Center | StewardTrack',
  description: 'Manage roles, permissions, and access control for your church management system',
};

export default function RbacDashboardPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          RBAC Command Center
        </h1>
        <p className="text-gray-600">
          Comprehensive role-based access control management for your church administration system
        </p>
      </div>

      <RbacDashboard />
    </div>
  );
}