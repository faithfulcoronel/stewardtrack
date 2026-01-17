'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { OnboardingWizard } from '@/components/onboarding';

/**
 * New Onboarding Page
 *
 * Streamlined 3-step wizard for church setup:
 * 1. Invite Your Team - Invite leadership with pre-assigned roles
 * 2. Import Your Data - Bulk import members and financial data from Excel
 * 3. Personalize - Upload church image for hero section
 *
 * All steps except Personalize are optional/skippable.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tenant info on mount
  useEffect(() => {
    const fetchTenantInfo = async () => {
      try {
        const response = await fetch('/api/onboarding/complete', {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch tenant info');
        }

        const data = await response.json();
        if (data.success && data.tenant) {
          setTenantName(data.tenant.name);

          // If onboarding is already completed, redirect to dashboard
          if (data.tenant.onboarding_completed) {
            router.push('/admin');
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching tenant info:', err);
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenantInfo();
  }, [router]);

  const handleComplete = () => {
    // Redirect to dashboard after onboarding completion
    router.push('/admin');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <div className="text-center max-w-md p-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Something went wrong
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <OnboardingWizard
      tenantName={tenantName}
      onComplete={handleComplete}
    />
  );
}
