'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, Loader2, Sparkles, Shield, Clock, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { svgPaths } from '@/components/landing/svg-paths';
import type { ProductOfferingWithFeatures } from '@/models/productOffering.model';

function BackgroundVectors() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 scale-[0.6] md:scale-[0.8] lg:scale-100 w-[1744px] h-[861px] opacity-10">
        <div className="absolute contents left-[calc(50%-1.79px)] top-[-1730.35px] translate-x-[-50%]">
          <div className="absolute flex inset-[33.1%_-24.54%_-246.18%_-24.3%] items-center justify-center mix-blend-soft-light">
            <div className="flex-none h-[2134.24px] rotate-[216.674deg] scale-y-[-100%] w-[1647.26px]">
              <div className="relative size-full">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1648 2135">
                  <g style={{ mixBlendMode: "soft-light" }}>
                    <path d={svgPaths.p1a8af200} fill="url(#paint0_linear_signup_1)" />
                  </g>
                  <defs>
                    <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_signup_1" x1="823.629" x2="823.629" y1="0" y2="2134.24">
                      <stop stopColor="white" />
                      <stop offset="0.677885" stopColor="#999999" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
          <div className="absolute h-[1816.56px] left-[-1607.71px] mix-blend-soft-light top-[194.98px] w-[2383.62px]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2384 1817">
              <g style={{ mixBlendMode: "soft-light" }}>
                <path d={svgPaths.pc49ab80} fill="url(#paint0_linear_signup_2)" />
              </g>
              <defs>
                <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_signup_2" x1="2382.44" x2="1.17413" y1="966.869" y2="963.788">
                  <stop stopColor="white" />
                  <stop offset="0.677885" stopColor="#999999" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="absolute flex h-[1816.56px] items-center justify-center left-[-1645.9px] mix-blend-soft-light top-[-1730.35px] w-[2498.19px]">
            <div className="flex-none scale-y-[-100%]">
              <div className="h-[1816.56px] relative w-[2498.19px]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2499 1817">
                  <g style={{ mixBlendMode: "soft-light" }}>
                    <path d={svgPaths.p37228480} fill="url(#paint0_linear_signup_3)" />
                  </g>
                  <defs>
                    <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_signup_3" x1="2496.96" x2="1.23098" y1="966.869" y2="963.485">
                      <stop stopColor="white" />
                      <stop offset="0.677885" stopColor="#999999" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
          <div className="absolute inset-[20.68%_-94.17%_-199.03%_54.27%] mix-blend-soft-light">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2440 2397">
              <g style={{ mixBlendMode: "soft-light" }}>
                <path d={svgPaths.p19254000} fill="url(#paint0_linear_signup_4)" fillOpacity="0.61" />
              </g>
              <defs>
                <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_signup_4" x1="107.792" x2="3448.24" y1="147.691" y2="1500.54">
                  <stop stopColor="white" />
                  <stop offset="0.953184" stopColor="#999999" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

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
        const grouped = activeOfferings.reduce((acc: Record<string, ProductOfferingWithFeatures[]>, offering: ProductOfferingWithFeatures) => {
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
        const displayOfferings = Object.values(grouped).map((tierOfferings) => {
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
    <div className="relative overflow-hidden min-h-[calc(100vh-200px)]">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#179a65] via-green-600 to-[#0F766E]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.08),transparent_40%)]" />
      <BackgroundVectors />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-36 pb-16 md:pt-44 md:pb-24">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-white mb-6">
            <span className="size-2 rounded-full bg-white animate-pulse" />
            14-Day Free Trial &bull; No Credit Card Required
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-white">
            Choose Your Plan
          </h1>
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto">
            Start managing your church more effectively today. Join 500+ churches already saving time.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
          >
            {sortedOfferings.map((offering, index) => (
              <motion.div
                key={offering.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className={`relative flex flex-col rounded-2xl p-6 transition-all duration-300 ${
                  offering.is_featured
                    ? 'bg-white text-gray-900 shadow-2xl scale-[1.02] z-10 border-none'
                    : 'bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20 hover:-translate-y-1'
                }`}
              >
                {offering.is_featured && (
                  <div className="absolute -top-4 left-0 right-0 text-center">
                    <span className="inline-flex items-center gap-1 bg-[#179a65] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                      <Sparkles className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6 pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-xl font-bold capitalize ${offering.is_featured ? 'text-[#179a65]' : 'text-white'}`}>
                      {offering.tier}
                    </h3>
                    {offering.offering_type === 'trial' && (
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        offering.is_featured ? 'bg-gray-100 text-gray-600' : 'bg-white/20 text-white'
                      }`}>
                        Trial
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      {formatPrice(offering)}
                    </span>
                    {offering.base_price && offering.base_price > 0 && (
                      <span className={`text-sm ${offering.is_featured ? 'text-gray-400' : 'text-white/70'}`}>
                        {getBillingPeriod(offering)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 mb-6">
                  <p className={`text-sm mb-6 ${offering.is_featured ? 'text-gray-500' : 'text-white/80'}`}>
                    {offering.description}
                  </p>

                  <div className="space-y-3">
                    {offering.max_users && (
                      <div className="flex items-start gap-3 text-sm">
                        <Check className={`h-5 w-5 mt-0.5 flex-shrink-0 ${offering.is_featured ? 'text-[#179a65]' : 'text-green-200'}`} />
                        <span>Up to {offering.max_users} users</span>
                      </div>
                    )}
                    {!offering.max_users && (
                      <div className="flex items-start gap-3 text-sm">
                        <Check className={`h-5 w-5 mt-0.5 flex-shrink-0 ${offering.is_featured ? 'text-[#179a65]' : 'text-green-200'}`} />
                        <span>Unlimited users</span>
                      </div>
                    )}
                    {offering.features && offering.features.slice(0, 5).map((feature) => (
                      <div key={feature.id} className="flex items-start gap-3 text-sm">
                        <Check className={`h-5 w-5 mt-0.5 flex-shrink-0 ${offering.is_featured ? 'text-[#179a65]' : 'text-green-200'}`} />
                        <span>{feature.name}</span>
                      </div>
                    ))}
                    {offering.features && offering.features.length > 5 && (
                      <p className={`text-sm italic pl-8 ${offering.is_featured ? 'text-gray-400' : 'text-white/60'}`}>
                        + {offering.features.length - 5} more features
                      </p>
                    )}
                  </div>
                </div>

                <button
                  className={`w-full py-3 px-6 rounded-xl font-bold text-sm transition-all ${
                    offering.is_featured
                      ? 'bg-[#179a65] text-white hover:bg-green-600 shadow-lg'
                      : 'bg-white text-[#179a65] hover:bg-gray-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={selectingId !== null}
                  onClick={() => handleSelectPlan(offering.id)}
                >
                  {selectingId === offering.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Selecting...
                    </span>
                  ) : (
                    'Choose Plan'
                  )}
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}

        {!isLoading && sortedOfferings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/80">
              No pricing plans available at this time. Please contact support.
            </p>
          </div>
        )}

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 space-y-8"
        >
          <div className="text-center">
            <p className="text-sm text-white/70">
              All plans include 30-day money-back guarantee. No credit card required for trial.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-8">
            <div className="flex items-center gap-3 text-sm text-white">
              <div className="rounded-full bg-white/20 p-2.5">
                <Clock className="size-4 text-white" />
              </div>
              <span className="font-medium">Cancel Anytime</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white">
              <div className="rounded-full bg-white/20 p-2.5">
                <Check className="size-4 text-white" />
              </div>
              <span className="font-medium">Instant Setup</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white">
              <div className="rounded-full bg-white/20 p-2.5">
                <Shield className="size-4 text-white" />
              </div>
              <span className="font-medium">Secure & Private</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white">
              <div className="rounded-full bg-white/20 p-2.5">
                <Users className="size-4 text-white" />
              </div>
              <span className="font-medium">24/7 Support</span>
            </div>
          </div>

          {/* FAQ Callout */}
          <div className="mx-auto max-w-2xl rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-8">
            <h3 className="text-center font-bold text-white mb-4 text-lg">
              Questions? We&apos;re Here to Help
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/#faq"
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-white hover:text-green-100 transition-colors"
              >
                View FAQ
              </a>
              <span className="hidden sm:inline text-white/40">&bull;</span>
              <a
                href="/contact"
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-white hover:text-green-100 transition-colors"
              >
                Contact Sales
              </a>
              <span className="hidden sm:inline text-white/40">&bull;</span>
              <a
                href="/demo"
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-white hover:text-green-100 transition-colors"
              >
                Schedule Demo
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
