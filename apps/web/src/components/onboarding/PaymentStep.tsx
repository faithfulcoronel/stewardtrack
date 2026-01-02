'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, CreditCard, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, SupportedCurrency, PRIMARY_CURRENCY } from '@/lib/currency';

interface PaymentStepProps {
  data: Record<string, any>;
  onNext: (data: any) => Promise<void>;
  onBack: () => void;
  onComplete: () => Promise<void>;
  isSaving: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export default function PaymentStep({
  onNext,
  isSaving,
}: PaymentStepProps) {
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  async function loadSubscriptionStatus() {
    try {
      setIsLoadingSubscription(true);
      const response = await fetch('/api/subscription/status');
      const result = await response.json();

      if (response.ok) {
        setSubscriptionData(result);
      } else {
        setError(result.error || 'Failed to load subscription status');
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
      setError('Failed to load subscription status');
    } finally {
      setIsLoadingSubscription(false);
    }
  }

  async function handleProceedToPayment() {
    if (!subscriptionData?.tenant?.id || !subscriptionData?.currentOffering?.id) {
      toast.error('Missing required information for payment');
      return;
    }

    setIsCreatingInvoice(true);

    try {
      const response = await fetch('/api/checkout/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: subscriptionData.tenant.id,
          offeringId: subscriptionData.currentOffering.id,
          payerEmail: "user@example.com", // TODO: Get from user profile
          payerName: subscriptionData.tenant.church_name || '',
        }),
      });

      const result = await response.json();

      if (result.success && result.invoice_url) {
        // Open payment page in new tab
        window.open(result.invoice_url, '_blank');
        toast.success('Payment page opened. Complete your payment to activate your subscription.');
      } else {
        toast.error(result.error || 'Failed to create payment invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create payment invoice. Please try again.');
    } finally {
      setIsCreatingInvoice(false);
    }
  }

  async function handleSkipPayment() {
    toast.info('You can complete payment later from your dashboard');
    await onNext({});
  }

  function formatPrice(price: number, currency: string = PRIMARY_CURRENCY): string {
    return formatCurrency(price, currency as SupportedCurrency);
  }

  if (isLoadingSubscription) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Unable to Load Payment Information
            </h2>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button onClick={loadSubscriptionStatus} variant="outline">
            Try Again
          </Button>
          <Button onClick={handleSkipPayment}>
            Skip for Now
          </Button>
        </div>
      </div>
    );
  }

  const isPaid = subscriptionData?.tenant?.payment_status === 'paid';
  const offering = subscriptionData?.currentOffering;

  // Check if offering has a price - look for resolved_price or prices array
  const getOfferingPrice = (): { price: number; currency: string } | null => {
    if (!offering) return null;

    // Try resolved_price first (from subscription status API)
    if (offering.resolved_price !== undefined && offering.resolved_price !== null) {
      return { price: offering.resolved_price, currency: offering.resolved_currency || PRIMARY_CURRENCY };
    }

    // Try prices array
    if (offering.prices && Array.isArray(offering.prices) && offering.prices.length > 0) {
      const activePrice = offering.prices.find((p: any) => p.is_active);
      if (activePrice) {
        return { price: activePrice.price, currency: activePrice.currency };
      }
    }

    return null;
  };

  const offeringPriceInfo = getOfferingPrice();
  const isFreeOrTrial = !offeringPriceInfo || offeringPriceInfo.price === 0;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
          isPaid ? 'bg-green-500/10' : 'bg-primary/10'
        }`}>
          {isPaid ? (
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          ) : (
            <CreditCard className="h-8 w-8 text-primary" />
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {isPaid ? 'Payment Received' : 'Complete Your Payment'}
          </h2>
          <p className="text-muted-foreground">
            {isPaid
              ? 'Your subscription is active and ready to use'
              : isFreeOrTrial
              ? 'Your trial period is active - no payment required'
              : 'Complete your payment to activate your subscription'}
          </p>
        </div>
      </div>

      {offering && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="capitalize">{offering.tier} Plan</CardTitle>
                <CardDescription>{offering.name}</CardDescription>
              </div>
              {isPaid && (
                <Badge variant="default" className="bg-green-500">
                  Active
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Amount</span>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">
                  {isFreeOrTrial ? 'Free' : formatPrice(offeringPriceInfo!.price, offeringPriceInfo!.currency)}
                </div>
                {!isFreeOrTrial && offering.billing_cycle && (
                  <div className="text-sm text-muted-foreground">
                    per {offering.billing_cycle}
                  </div>
                )}
              </div>
            </div>

            {subscriptionData?.tenant?.next_billing_date && (
              <>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Next Billing Date</span>
                  <span className="font-medium">
                    {new Date(subscriptionData.tenant.next_billing_date).toLocaleDateString()}
                  </span>
                </div>
              </>
            )}

            {!isPaid && !isFreeOrTrial && (
              <>
                <Separator />
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    What you'll get:
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Full access to all features
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Priority email support
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      30-day money-back guarantee
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Cancel anytime
                    </li>
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              {isPaid || isFreeOrTrial ? 'Payment Options Available' : 'Secure Payment'}
            </p>
            <p className="text-blue-700 dark:text-blue-300">
              {isPaid
                ? 'You can manage your subscription and payment methods from your dashboard anytime.'
                : isFreeOrTrial
                ? 'You can skip this step and continue with your trial. Upgrade to a paid plan anytime from your dashboard.'
                : 'You can complete payment now or skip and pay later from your dashboard. Your account will remain active during the trial period.'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        {!isPaid && !isFreeOrTrial && (
          <Button
            onClick={handleProceedToPayment}
            disabled={isCreatingInvoice || isSaving}
            size="lg"
            className="flex-1"
          >
            {isCreatingInvoice ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Invoice...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Proceed to Payment
                <ExternalLink className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        )}

        <Button
          onClick={handleSkipPayment}
          disabled={isSaving}
          variant={isPaid || isFreeOrTrial ? 'default' : 'outline'}
          size="lg"
          className={!isPaid && !isFreeOrTrial ? 'flex-1' : 'w-full'}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Continuing...
            </>
          ) : isPaid || isFreeOrTrial ? (
            'Continue to Dashboard'
          ) : (
            'Skip for Now'
          )}
        </Button>
      </div>

      {!isPaid && !isFreeOrTrial && (
        <p className="text-xs text-center text-muted-foreground">
          By proceeding to payment, you agree to our{' '}
          <a href="/terms" className="underline hover:text-foreground" target="_blank">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="underline hover:text-foreground" target="_blank">
            Privacy Policy
          </a>
        </p>
      )}
    </div>
  );
}
