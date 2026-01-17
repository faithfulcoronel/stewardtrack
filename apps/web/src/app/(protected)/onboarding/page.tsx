'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { OnboardingWizard } from '@/components/onboarding';
import { PaymentHandleModal } from '@/components/payment-handler/PaymentHandleModal';

/**
 * New Onboarding Page
 *
 * Streamlined 3-step wizard for church setup:
 * 1. Invite Your Team - Invite leadership with pre-assigned roles (optional)
 * 2. Import Your Data - Bulk import members and financial data from Excel (optional)
 * 3. Personalize - Upload church image for hero section
 *
 * Payment is handled separately via subscription flow, not during onboarding.
 */

// Loading fallback for Suspense boundary
function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-8 px-4 sm:px-6 lg:px-8">
      <div className="container max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Skeleton className="h-9 w-64 mx-auto mb-2" />
          <Skeleton className="h-5 w-80 mx-auto" />
        </div>
        <div className="mb-8">
          <Skeleton className="h-2 w-full" />
        </div>
        <Card className="mb-8">
          <CardHeader>
            <Skeleton className="h-7 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Main onboarding content that uses useSearchParams
function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenantName, setTenantName] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Check for payment callback parameter
  const payment = searchParams.get('payment');

  useEffect(() => {
    // Show payment modal when payment parameter has a value (from payment callback)
    if (payment != null) {
      setShowPaymentModal(true);
    }
  }, [payment]);

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

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    // Remove payment parameter from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete('payment');
    router.replace(`/onboarding${params.toString() ? `?${params.toString()}` : ''}`);
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
    <>
      <OnboardingWizard
        tenantName={tenantName}
        onComplete={handleComplete}
      />

      {/* Payment callback modal (for subscription payment returns) */}
      <PaymentHandleModal
        open={showPaymentModal}
        onOpenChange={handleClosePaymentModal}
        paymentId={payment || undefined}
        onClose={handleClosePaymentModal}
        source="onboarding"
      />
    </>
  );
}

// Page export wrapped in Suspense for useSearchParams
export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingLoading />}>
      <OnboardingContent />
    </Suspense>
  );
}
