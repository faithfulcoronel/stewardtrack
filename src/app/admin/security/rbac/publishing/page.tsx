import { Metadata } from 'next';
import { MetadataPublishingControls } from '@/components/admin/rbac/MetadataPublishingControls';

export const metadata: Metadata = {
  title: 'Metadata Publishing Controls | StewardTrack',
  description: 'Monitor and control RBAC metadata compilation and distribution across tenants',
};

export default function PublishingPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <MetadataPublishingControls />
    </div>
  );
}