import { Metadata } from 'next';
import { AdvancedPermissionMapper } from '@/components/admin/rbac/AdvancedPermissionMapper';

export const metadata: Metadata = {
  title: 'Advanced Permission Mapper | StewardTrack',
  description: 'Visualize and manage complex permission relationships across roles, bundles, and surfaces',
};

export default function PermissionMapperPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <AdvancedPermissionMapper />
    </div>
  );
}