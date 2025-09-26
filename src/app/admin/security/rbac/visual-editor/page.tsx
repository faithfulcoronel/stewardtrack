import { Metadata } from 'next';
import { VisualBindingEditor } from '@/components/admin/rbac/VisualBindingEditor';

export const metadata: Metadata = {
  title: 'Visual Binding Editor | StewardTrack',
  description: 'Create and manage connections between UI surfaces, roles, bundles, and feature licenses',
};

export default function VisualEditorPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <VisualBindingEditor />
    </div>
  );
}