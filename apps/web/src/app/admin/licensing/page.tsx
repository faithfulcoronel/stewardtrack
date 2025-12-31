import { Metadata } from 'next';
import { LicensingStudio } from '@/components/admin/licensing/LicensingStudio';
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentUserId } from '@/lib/server/context';

export const metadata: Metadata = {
  title: 'Licensing Studio | StewardTrack',
  description: 'Manage product offerings, feature bundles, and tenant licenses',
};

export default async function LicensingPage() {
  const userId = await getCurrentUserId({ redirectTo: '/login-required' });

  const gate = Gate.superAdminOnly({
    fallbackPath: '/unauthorized',
  });

  return (
    <ProtectedPage gate={gate} userId={userId}>
      <div className="container mx-auto px-4 py-6">
        <LicensingStudio />
      </div>
    </ProtectedPage>
  );
}
