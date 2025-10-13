import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LicensingStudio } from '@/components/admin/licensing/LicensingStudio';
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { authUtils } from '@/utils/authUtils';

export const metadata: Metadata = {
  title: 'Licensing Studio | StewardTrack',
  description: 'Manage product offerings, feature bundles, and tenant licenses',
};

export default async function LicensingPage() {
  // Get current user
  const user = await authUtils.getUser();

  if (!user) {
    // Redirect to login if not authenticated
    redirect('/login-required');
  }

  // Super admin access gate - one line protection!
  const gate = Gate.superAdminOnly({
    fallbackPath: '/unauthorized',
  });

  return (
    <ProtectedPage gate={gate} userId={user.id}>
      <div className="container mx-auto px-4 py-6">
        <LicensingStudio />
      </div>
    </ProtectedPage>
  );
}
