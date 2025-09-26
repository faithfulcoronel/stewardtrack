import { Metadata } from 'next';
import { SurfaceBindingManager } from '@/components/admin/rbac/SurfaceBindingManager';

export const metadata: Metadata = {
  title: 'Surface Binding Manager | StewardTrack',
  description: 'Manage metadata surface connections to roles, bundles, and feature licensing',
};

export default function SurfaceBindingsPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <SurfaceBindingManager />
    </div>
  );
}