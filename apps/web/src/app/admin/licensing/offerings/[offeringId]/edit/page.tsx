import { type Metadata } from 'next';
import { ProtectedPage } from '@/components/access-gate';
import { Gate } from '@/lib/access-gate';
import { getCurrentUserId } from '@/lib/server/context';
import { OfferingForm } from '@/components/admin/licensing/OfferingForm';

interface PageParams {
  params: Promise<{
    offeringId: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Edit Product Offering | StewardTrack',
  description: 'Update subscription plan details and manage assigned bundles.',
};

export default async function EditProductOfferingPage({ params }: PageParams) {
  const { offeringId } = await params;
  const userId = await getCurrentUserId({ redirectTo: '/login-required' });
  const gate = Gate.superAdminOnly({
    fallbackPath: '/unauthorized',
  });

  return (
    <ProtectedPage gate={gate} userId={userId}>
      <div className="container mx-auto px-4 py-6">
        <OfferingForm mode="edit" offeringId={offeringId} redirectPath="/admin/licensing?tab=offerings" />
      </div>
    </ProtectedPage>
  );
}

