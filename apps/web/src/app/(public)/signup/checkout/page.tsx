'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, CheckCircle2, XCircle } from 'lucide-react';

/**
 * Checkout Page
 *
 * Displays payment information and redirects to Xendit payment gateway.
 * Used after registration to collect payment for paid plans.
 *
 * Flow:
 * 1. User registers account (creates tenant with pending payment)
 * 2. Redirected to /signup/checkout?tenant_id=xxx&offering_id=xxx
 * 3. Page creates Xendit invoice via API
 * 4. User redirected to Xendit payment page
 * 5. After payment, redirected to /signup/success or /signup/failed
 */

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tenantId = searchParams?.get('tenant_id');
  const offeringId = searchParams?.get('offering_id');
  const payerEmail = searchParams?.get('email');
  const payerName = searchParams?.get('name');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offering, setOffering] = useState<any>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || !offeringId || !payerEmail || !payerName) {
      setError('Missing required parameters. Please start registration again.');
      setLoading(false);
      return;
    }

    createInvoice();
  }, [tenantId, offeringId, payerEmail, payerName]);

  const createInvoice = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create Xendit invoice
      const response = await fetch('/api/checkout/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          offeringId,
          payerEmail,
          payerName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment invoice');
      }

      setInvoiceUrl(data.invoice_url);

      // Auto-redirect to Xendit payment page after 2 seconds
      setTimeout(() => {
        window.location.href = data.invoice_url;
      }, 2000);
    } catch (err: any) {
      console.error('[Checkout] Error:', err);
      setError(err.message || 'Failed to initialize payment');
      setLoading(false);
    }
  };

  const handleManualRedirect = () => {
    if (invoiceUrl) {
      window.location.href = invoiceUrl;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-6 w-6" />
              <CardTitle>Payment Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => router.push('/signup')}
                variant="outline"
                className="w-full"
              >
                Back to Sign Up
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Try Again
              </Button>
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
            <CreditCard className="h-6 w-6 text-blue-600" />
            <CardTitle>Processing Payment</CardTitle>
          </div>
          <CardDescription>
            You will be redirected to the payment page shortly...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            <p className="text-sm text-gray-600">
              Setting up secure payment gateway...
            </p>
          </div>

          {invoiceUrl && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Payment page is ready! You will be redirected automatically.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleManualRedirect}
                className="w-full"
                variant="outline"
              >
                Click here if not redirected
              </Button>
            </div>
          )}

          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>Powered by Xendit</p>
            <p>Your payment information is secure and encrypted</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutPage() {
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
      <CheckoutPageContent />
    </Suspense>
  );
}
