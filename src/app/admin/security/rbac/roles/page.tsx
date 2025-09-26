import { Metadata } from 'next';
import { RoleExplorer } from '@/components/admin/rbac/RoleExplorer';

export const metadata: Metadata = {
  title: 'Role & Bundle Explorer | RBAC | StewardTrack',
  description: 'Explore and manage roles, permission bundles, and access patterns',
};

export default function RoleExplorerPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Role & Bundle Explorer
        </h1>
        <p className="text-gray-600">
          Browse, create, and manage roles and permission bundles for comprehensive access control
        </p>
      </div>

      <RoleExplorer />
    </div>
  );
}