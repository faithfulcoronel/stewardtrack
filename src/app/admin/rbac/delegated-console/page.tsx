import { Metadata } from 'next';
import { DelegatedConsole } from '@/components/admin/rbac/DelegatedConsole';

export const metadata: Metadata = {
  title: 'Delegated Console | RBAC Management',
  description: 'Campus and ministry-scoped delegated RBAC console for managing volunteer access'
};

export default function DelegatedConsolePage() {
  return (
    <div className="container mx-auto py-6">
      <DelegatedConsole />
    </div>
  );
}