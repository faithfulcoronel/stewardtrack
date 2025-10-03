import { Metadata } from 'next';
import { RbacDashboard } from '@/components/admin/rbac/RbacDashboard';

export const metadata: Metadata = {
  title: 'RBAC Command Center | StewardTrack',
  description: 'Manage roles, permissions, and access control for your church management system',
};

export default function RbacDashboardPage() {
  return (
    <div className="container mx-auto px-4 py-6">


      <RbacDashboard />
    </div>
  );
}