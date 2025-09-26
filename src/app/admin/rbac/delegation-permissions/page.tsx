import { Metadata } from 'next';
import { DelegationPermissionManager } from '@/components/admin/rbac/DelegationPermissionManager';

export const metadata: Metadata = {
  title: 'Delegation Permissions | RBAC Management',
  description: 'Manage delegation permissions and access controls'
};

export default function DelegationPermissionsPage() {
  return (
    <div className="container mx-auto py-6">
      <DelegationPermissionManager />
    </div>
  );
}