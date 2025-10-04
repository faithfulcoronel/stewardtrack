import { Metadata } from 'next';
import { LicensingStudio } from '@/components/admin/licensing/LicensingStudio';

export const metadata: Metadata = {
  title: 'Licensing Studio | StewardTrack',
  description: 'Manage product offerings, feature bundles, and tenant licenses',
};

export default function LicensingPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <LicensingStudio />
    </div>
  );
}
