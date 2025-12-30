'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { XCircle, RotateCcw, Loader2 } from 'lucide-react';

/**
 * Payment Failed Page
 *
 * Shown when Xendit payment fails or expires.
 * Allows user to retry payment or contact support.
 */

function FailedPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const reason = searchParams?.get('reason') || 'Payment was not completed';
  const externalId = searchParams?.get('external_id');

  const handleRetryPayment = () => {
    // Redirect back to checkout to create new invoice
    const tenantId = searchParams?.get('tenant_id');
    const offeringId = searchParams?.get('offering_id');
    const email = searchParams?.get('email');
    const name = searchParams?.get('name');

    if (tenantId && offeringId && email && name) {
      router.push(
        `/signup/checkout?tenant_id=${tenantId}&offering_id=${offeringId}&email=${email}&name=${name}`
      );
    } else {
      router.push('/signup');
    }
  };

  const handleContactSupport = () => {
    // TODO: Replace with actual support email or link
    window.location.href = 'mailto:support@stewardtrack.com?subject=Payment Failed - Need Assistance';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="h-6 w-6" />
            <CardTitle>Payment Not Completed</CardTitle>
          </div>
          <CardDescription>
            Your payment could not be processed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="rounded-full bg-red-100 p-6">
              <XCircle className="h-16 w-16 text-red-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Payment Failed</h3>
              <p className="text-sm text-gray-600">
                We were unable to process your payment
              </p>
            </div>
          </div>

          <Alert variant="destructive">
            <AlertDescription>{reason}</AlertDescription>
          </Alert>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Common reasons for payment failure:</h4>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Insufficient funds in account</li>
              <li>Payment method declined by bank</li>
              <li>Payment timeout or expired session</li>
              <li>Incorrect payment details entered</li>
              <li>Network connection issues</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleRetryPayment}
              className="w-full"
              size="lg"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Try Payment Again
            </Button>

            <Button
              onClick={handleContactSupport}
              variant="outline"
              className="w-full"
            >
              Contact Support
            </Button>

            <Button
              onClick={() => router.push('/signup')}
              variant="ghost"
              className="w-full"
            >
              Back to Sign Up
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>Need help? We're here to assist you.</p>
            <p>Email: support@stewardtrack.com</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FailedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card className="max-w-md w-full">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                <p className="text-sm text-gray-600">Loading...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <FailedPageContent />
    </Suspense>
  );
}
