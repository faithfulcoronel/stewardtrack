'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, PartyPopper } from 'lucide-react';

/**
 * Payment Success Page
 *
 * Shown after successful Xendit payment.
 * Verifies payment status and redirects to onboarding.
 */

function SuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const externalId = searchParams?.get('external_id');
  const invoiceId = searchParams?.get('invoice_id');

  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<any>(null);

  useEffect(() => {
    // Only attempt verification if we have at least one identifier
    if (externalId || invoiceId) {
      verifyPayment();
    } else {
      // No payment identifiers provided - show error immediately
      setError('No payment reference found. Please return to signup or contact support.');
      setVerifying(false);
    }
  }, [externalId, invoiceId]);

  const verifyPayment = async () => {
    // Guard: don't attempt verification without identifiers
    if (!externalId && !invoiceId) {
      setError('No payment reference found. Please return to signup or contact support.');
      setVerifying(false);
      return;
    }

    try {
      setVerifying(true);

      const params = new URLSearchParams();
      if (externalId) params.append('external_id', externalId);
      if (invoiceId) params.append('invoice_id', invoiceId);

      const response = await fetch(`/api/checkout/verify-payment?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify payment');
      }

      if (data.status === 'paid' || data.status === 'settled') {
        setVerified(true);
        setPayment(data.payment);

        // Redirect to onboarding after 3 seconds
        setTimeout(() => {
          router.push('/onboarding');
        }, 3000);
      } else {
        setError(`Payment status: ${data.status}. Please contact support if you believe this is an error.`);
      }
    } catch (err: any) {
      console.error('[Payment Verification] Error:', err);
      setError(err.message || 'Failed to verify payment');
    } finally {
      setVerifying(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Verifying Payment</CardTitle>
            <CardDescription>Please wait while we confirm your payment...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              <p className="text-sm text-gray-600">Confirming transaction...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Payment Verification Issue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>

            <div className="flex flex-col gap-2">
              {(externalId || invoiceId) ? (
                <>
                  <Button onClick={() => verifyPayment()} className="w-full">
                    Try Again
                  </Button>
                  <Button
                    onClick={() => router.push('/onboarding')}
                    variant="outline"
                    className="w-full"
                  >
                    Continue to Onboarding
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => router.push('/signup')}
                  className="w-full"
                >
                  Return to Signup
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <CardTitle>Payment Successful!</CardTitle>
          </div>
          <CardDescription>
            Your subscription has been activated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="rounded-full bg-green-100 p-6">
              <PartyPopper className="h-16 w-16 text-green-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Welcome to StewardTrack!</h3>
              <p className="text-sm text-gray-600">
                Your payment has been processed successfully
              </p>
            </div>
          </div>

          {payment && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">Payment Details</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">
                    {payment.currency} {payment.amount.toFixed(2)}
                  </span>
                </div>
                {payment.payment_method && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Method:</span>
                    <span className="font-medium capitalize">
                      {payment.payment_method.replace('_', ' ')}
                    </span>
                  </div>
                )}
                {payment.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paid:</span>
                    <span className="font-medium">
                      {new Date(payment.paid_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Alert>
            <AlertDescription>
              Redirecting to onboarding wizard in 3 seconds...
            </AlertDescription>
          </Alert>

          <Button
            onClick={() => router.push('/onboarding')}
            className="w-full"
          >
            Continue to Onboarding
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SuccessPage() {
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
      <SuccessPageContent />
    </Suspense>
  );
}
