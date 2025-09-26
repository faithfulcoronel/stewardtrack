import { Metadata } from 'next';
import { BundleComposer } from '@/components/admin/rbac/BundleComposer';

export const metadata: Metadata = {
  title: 'Permission Bundle Composer | RBAC | StewardTrack',
  description: 'Create and manage reusable permission bundles with guided composition wizard',
};

export default function BundleComposerPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Permission Bundle Composer
        </h1>
        <p className="text-gray-600">
          Create reusable permission sets using our guided composition wizard, tailored for different church sizes and ministry structures
        </p>
      </div>

      <BundleComposer />
    </div>
  );
}