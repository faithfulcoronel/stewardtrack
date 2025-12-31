'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { ProductOfferingWithFeatures } from '@/models/productOffering.model';

export default function SignupPage() {
  const router = useRouter();
  const [offerings, setOfferings] = useState<ProductOfferingWithFeatures[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    loadOfferings();
  }, []);

  async function loadOfferings() {
    try {
      const response = await fetch('/api/licensing/product-offerings?withFeatures=true');
      const result = await response.json();

      if (result.success) {
        const activeOfferings = result.data.filter((o: ProductOfferingWithFeatures) => o.is_active);

        // Group by tier and sort
        const grouped = activeOfferings.reduce((acc: any, offering: ProductOfferingWithFeatures) => {
          if (!acc[offering.tier]) {
            acc[offering.tier] = [];
          }
          acc[offering.tier].push(offering);
          return acc;
        }, {});

        // Sort offerings within each tier by billing cycle
        Object.keys(grouped).forEach(tier => {
          grouped[tier].sort((a: ProductOfferingWithFeatures, b: ProductOfferingWithFeatures) => {
            const cycleOrder = { 'trial': 0, 'monthly': 1, 'annual': 2, 'lifetime': 3 };
            const aOrder = cycleOrder[a.billing_cycle as keyof typeof cycleOrder] ?? 99;
            const bOrder = cycleOrder[b.billing_cycle as keyof typeof cycleOrder] ?? 99;
            return aOrder - bOrder;
          });
        });

        // Flatten and display (show one offering per tier, preferring featured)
        const displayOfferings = Object.values(grouped).map((tierOfferings: any) => {
          return tierOfferings.find((o: ProductOfferingWithFeatures) => o.is_featured) || tierOfferings[0];
        });

        setOfferings(displayOfferings);
      } else {
        toast.error(result.error || 'Failed to load pricing plans');
      }
    } catch (error) {
      console.error('Error loading offerings:', error);
      toast.error('Failed to load pricing plans');
    } finally {
      setIsLoading(false);
    }
  }

  function handleSelectPlan(offeringId: string) {
    setSelectingId(offeringId);
    router.push(`/signup/register?offering=${offeringId}`);
  }

  function formatPrice(offering: ProductOfferingWithFeatures): string {
    if (!offering.base_price || offering.base_price === 0) {
      return 'Free';
    }

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: offering.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    return formatter.format(offering.base_price);
  }

  function getBillingPeriod(offering: ProductOfferingWithFeatures): string {
    if (!offering.billing_cycle) return '';

    const periods: Record<string, string> = {
      monthly: '/month',
      annual: '/year',
      lifetime: 'one-time',
    };

    return periods[offering.billing_cycle] || '';
  }

  const tierOrder = ['starter', 'professional', 'enterprise', 'custom'];
  const sortedOfferings = [...offerings].sort((a, b) => {
    return tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
  });

  return (
    <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="text-center mb-12 space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm mb-4">
          <span className="size-2 rounded-full bg-primary animate-pulse" />
          14-Day Free Trial • No Credit Card Required
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
          Choose Your Plan
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
          Start managing your church more effectively today. Join 500+ churches already saving time.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {sortedOfferings.map((offering) => (
            <Card
              key={offering.id}
              className={`relative flex flex-col ${offering.is_featured ? 'border-primary shadow-lg' : ''}`}
            >
              {offering.is_featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">
                    <Sparkles className="h-3 w-3 mr-1 inline" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-xl capitalize">{offering.tier}</CardTitle>
                  {offering.offering_type === 'trial' && (
                    <Badge variant="secondary">Trial</Badge>
                  )}
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">
                    {formatPrice(offering)}
                  </span>
                  {offering.base_price && offering.base_price > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {getBillingPeriod(offering)}
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground mb-6">
                  {offering.description}
                </p>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground mb-3">
                    Features included:
                  </h4>
                  <ul className="space-y-2">
                    {offering.max_users && (
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Up to {offering.max_users} users</span>
                      </li>
                    )}
                    {!offering.max_users && (
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Unlimited users</span>
                      </li>
                    )}
                    {offering.features && offering.features.slice(0, 5).map((feature) => (
                      <li key={feature.id} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature.name}</span>
                      </li>
                    ))}
                    {offering.features && offering.features.length > 5 && (
                      <li className="text-sm text-muted-foreground italic">
                        + {offering.features.length - 5} more features
                      </li>
                    )}
                  </ul>
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={offering.is_featured ? 'default' : 'outline'}
                  disabled={selectingId !== null}
                  onClick={() => handleSelectPlan(offering.id)}
                >
                  {selectingId === offering.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Selecting...
                    </>
                  ) : (
                    'Choose Plan'
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && sortedOfferings.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No pricing plans available at this time. Please contact support.
          </p>
        </div>
      )}

      <div className="mt-12 space-y-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            All plans include 30-day money-back guarantee. No credit card required for trial.
          </p>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="rounded-full bg-primary/10 p-1.5">
              <Check className="size-3 text-primary" />
            </div>
            <span>Cancel Anytime</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="rounded-full bg-primary/10 p-1.5">
              <Check className="size-3 text-primary" />
            </div>
            <span>Instant Setup</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="rounded-full bg-primary/10 p-1.5">
              <Check className="size-3 text-primary" />
            </div>
            <span>Secure & Private</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="rounded-full bg-primary/10 p-1.5">
              <Check className="size-3 text-primary" />
            </div>
            <span>24/7 Support</span>
          </div>
        </div>

        {/* FAQ Callout */}
        <div className="mx-auto max-w-2xl rounded-xl border border-border/60 bg-card/50 p-6 backdrop-blur-sm">
          <h3 className="text-center font-semibold text-foreground mb-4">
            Questions? We're Here to Help
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/#faq"
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              View FAQ
            </a>
            <span className="hidden sm:inline text-muted-foreground">•</span>
            <a
              href="/contact"
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Contact Sales
            </a>
            <span className="hidden sm:inline text-muted-foreground">•</span>
            <a
              href="/demo"
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Schedule Demo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
