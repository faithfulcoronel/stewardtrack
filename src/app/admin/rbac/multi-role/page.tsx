import { Metadata } from 'next';
import { MultiRoleAssignment } from '@/components/admin/rbac/MultiRoleAssignment';

export const metadata: Metadata = {
  title: 'Multi-Role Assignment | RBAC Management',
  description: 'Assign multiple roles to volunteers with conflict analysis and resolution'
};

export default function MultiRolePage() {
  return (
    <div className="container mx-auto py-6">
      <MultiRoleAssignment />
    </div>
  );
}