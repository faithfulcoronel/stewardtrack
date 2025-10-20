import { type Metadata } from 'next';
import { ProtectedPage } from '@/components/access-gate';
import { Gate } from '@/lib/access-gate';
import { getCurrentUserId } from '@/lib/server/context';
import { OfferingForm } from '@/components/admin/licensing/OfferingForm';

export const metadata: Metadata = {
  title: 'Create Product Offering | StewardTrack',
  description: 'Create a new subscription plan and assign feature bundles.',
};

export default async function CreateProductOfferingPage() {
  const userId = await getCurrentUserId({ redirectTo: '/login-required' });
  const gate = Gate.superAdminOnly({
    fallbackPath: '/unauthorized',
  });

  return (
    <ProtectedPage gate={gate} userId={userId}>
      <div className="container mx-auto px-4 py-6">
        <OfferingForm mode="create" redirectPath="/admin/licensing" />
      </div>
    </ProtectedPage>
  );
}

