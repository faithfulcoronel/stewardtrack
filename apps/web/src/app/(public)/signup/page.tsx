'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, Loader2, Sparkles, Shield, Clock, Users, Tag, Heart, Zap, Crown, Building2, HardDrive, ArrowRight } from 'lucide-react';
import { PlanComparisonMatrix } from '@/components/landing/PlanComparisonMatrix';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { svgPaths } from '@/components/landing/svg-paths';
import type { ProductOfferingWithFeatures, ProductOfferingPrice } from '@/models/productOffering.model';
import type { ActiveDiscount } from '@/models/discount.model';

interface OfferingDiscount {
  offeringId: string;
  discount: ActiveDiscount;
  originalPrice: number;
  discountedPrice: number;
  discountAmount: number;
}

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
  const [allOfferings, setAllOfferings] = useState<ProductOfferingWithFeatures[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [offeringDiscounts, setOfferingDiscounts] = useState<Record<string, OfferingDiscount>>({});
  const [activeBanner, setActiveBanner] = useState<{ text: string; endsAt: string | null } | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Find trial offering (for "Start Free Trial" CTA on paid tiers)
  const trialOffering = allOfferings.find(o => o.offering_type === 'trial');
  const trialDays = (trialOffering as any)?.trial_days || 30;

  // Filter offerings based on selected billing cycle
  // Note: Trial offerings are NOT shown as separate cards - trials are a CTA option on paid tiers
  const offerings = allOfferings.filter(o => {
    // Don't show trial offerings as separate cards (trials are handled via CTA on paid tiers)
    if (o.offering_type === 'trial') return false;
    // Always show free offerings (Essential tier)
    if (o.offering_type === 'free' || (o.metadata as any)?.pricing?.is_free) return true;
    // Show offerings matching the selected billing cycle
    return o.billing_cycle === billingCycle;
  });

  // Check if a tier has a trial available
  const hasTrial = (tier: string) => {
    return trialOffering && trialOffering.tier === tier;
  };

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        if (data.authenticated) {
          router.replace('/admin');
          return;
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
      // Only load offerings if not authenticated
      loadOfferings();
    };

    checkAuth();
  }, [router]);

  async function loadOfferings() {
    try {
      const response = await fetch('/api/licensing/product-offerings?withFeatures=true');
      const result = await response.json();

      if (result.success) {
        const activeOfferings = result.data.filter((o: ProductOfferingWithFeatures) => o.is_active);
        setAllOfferings(activeOfferings);

        // Load discounts for all offerings
        await loadDiscountsForOfferings(activeOfferings);
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

  async function loadDiscountsForOfferings(offerings: ProductOfferingWithFeatures[]) {
    const discountMap: Record<string, OfferingDiscount> = {};
    let bannerDiscount: { text: string; endsAt: string | null } | null = null;

    for (const offering of offerings) {
      try {
        const priceInfo = getOfferingPriceRaw(offering);
        if (!priceInfo || priceInfo.price === 0) continue;

        const response = await fetch(
          `/api/licensing/discounts/apply`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              offeringId: offering.id,
              amount: priceInfo.price,
              currency: priceInfo.currency,
            }),
          }
        );
        const result = await response.json();

        if (result.success && result.data.discount) {
          discountMap[offering.id] = {
            offeringId: offering.id,
            discount: result.data.discount,
            originalPrice: result.data.originalPrice,
            discountedPrice: result.data.discountedPrice,
            discountAmount: result.data.discountAmount,
          };

          // Check for banner text
          if (result.data.discount.banner_text && !bannerDiscount) {
            bannerDiscount = {
              text: result.data.discount.banner_text,
              endsAt: result.data.discount.ends_at,
            };
          }
        }
      } catch (error) {
        console.error(`Error loading discount for offering ${offering.id}:`, error);
      }
    }

    setOfferingDiscounts(discountMap);
    if (bannerDiscount) {
      setActiveBanner(bannerDiscount);
    }
  }

  function getOfferingPriceRaw(offering: ProductOfferingWithFeatures): { price: number; currency: string } | null {
    const prices = (offering as any).prices as ProductOfferingPrice[] | undefined;
    if (!prices || prices.length === 0) return null;

    const phpPrice = prices.find(p => p.currency === 'PHP' && p.is_active);
    if (phpPrice) return { price: phpPrice.price, currency: phpPrice.currency };

    const firstActive = prices.find(p => p.is_active);
    if (firstActive) return { price: firstActive.price, currency: firstActive.currency };

    return null;
  }

  function handleSelectPlan(offeringId: string) {
    setSelectingId(offeringId);
    router.push(`/signup/register?offering=${offeringId}`);
  }

  function getOfferingPrice(offering: ProductOfferingWithFeatures): { price: number; currency: string } | null {
    const prices = (offering as any).prices as ProductOfferingPrice[] | undefined;
    if (!prices || prices.length === 0) return null;

    // Prefer PHP (primary currency), then first active price
    const phpPrice = prices.find(p => p.currency === 'PHP' && p.is_active);
    if (phpPrice) return { price: phpPrice.price, currency: phpPrice.currency };

    const firstActive = prices.find(p => p.is_active);
    if (firstActive) return { price: firstActive.price, currency: firstActive.currency };

    return null;
  }

  function formatPrice(offering: ProductOfferingWithFeatures): string {
    const priceInfo = getOfferingPrice(offering);
    if (!priceInfo || priceInfo.price === 0) {
      return 'Free';
    }

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: priceInfo.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    return formatter.format(priceInfo.price);
  }

  function hasPrice(offering: ProductOfferingWithFeatures): boolean {
    const priceInfo = getOfferingPrice(offering);
    return priceInfo !== null && priceInfo.price > 0;
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

  function formatPriceValue(price: number, currency: string): string {
    if (price === 0) return 'Free';

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    return formatter.format(price);
  }

  const tierOrder = ['essential', 'premium', 'professional', 'enterprise', 'custom'];
  const sortedOfferings = [...offerings].sort((a, b) => {
    return tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
  });

  // Tier-specific configuration matching the landing page
  const getTierConfig = (tier: string) => {
    const configs: Record<string, {
      icon: React.ReactNode;
      tagline: string;
      bestFor: string;
      keyHighlights: string[];
    }> = {
      essential: {
        icon: <Heart className="w-5 h-5" />,
        tagline: 'Perfect Start',
        bestFor: 'Small churches',
        keyHighlights: ['Free forever', 'Up to 25 members', 'Up to 100 emails/month'],
      },
      premium: {
        icon: <Zap className="w-5 h-5" />,
        tagline: 'Growing Together',
        bestFor: 'Growing congregations',
        keyHighlights: ['Import/Export data', 'SMS & Email campaigns', 'Advanced reports'],
      },
      professional: {
        icon: <Crown className="w-5 h-5" />,
        tagline: 'Full Power',
        bestFor: 'Established churches',
        keyHighlights: ['Online donations & event payments', 'AI Chat & Compose', 'Facebook Integration'],
      },
      enterprise: {
        icon: <Building2 className="w-5 h-5" />,
        tagline: 'Scale Without Limits',
        bestFor: 'Large & multi-campus',
        keyHighlights: ['Unlimited everything', 'Multi-campus support', 'API access & integrations'],
      },
      custom: {
        icon: <Building2 className="w-5 h-5" />,
        tagline: 'Tailored Solution',
        bestFor: 'Unique requirements',
        keyHighlights: ['Custom features', 'Dedicated support', 'Enterprise SLA'],
      },
    };
    return configs[tier] || configs.essential;
  };

  // Get quota highlights for display
  const getQuotaHighlights = (offering: ProductOfferingWithFeatures) => {
    const highlights: { icon: React.ReactNode; label: string; value: string }[] = [];
    const o = offering as any;

    if (o.max_members !== undefined) {
      highlights.push({
        icon: <Users className="w-4 h-4" />,
        label: 'Members',
        value: o.max_members === null ? 'Unlimited' : `Up to ${o.max_members}`,
      });
    }

    if (o.max_storage_mb !== undefined) {
      highlights.push({
        icon: <HardDrive className="w-4 h-4" />,
        label: 'Storage',
        value: o.max_storage_mb === null ? 'Unlimited' : o.max_storage_mb >= 1024 ? `${(o.max_storage_mb / 1024).toFixed(0)} GB` : `${o.max_storage_mb} MB`,
      });
    }

    return highlights.slice(0, 2);
  };

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
          {activeBanner && (
            <div className="inline-flex items-center gap-2 rounded-full bg-yellow-400 backdrop-blur-sm px-4 py-2 text-sm font-bold text-gray-900 mb-4 shadow-lg animate-pulse">
              <Tag className="h-4 w-4" />
              {activeBanner.text}
              {activeBanner.endsAt && (
                <span className="text-xs font-normal ml-2">
                  Ends {new Date(activeBanner.endsAt).toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-white mb-6">
            <span className="size-2 rounded-full bg-white animate-pulse" />
            {trialDays}-Day Free Trial &bull; No Credit Card Required
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-white">
            Choose Your Plan
          </h1>
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-8">
            Start managing your church more effectively today. Join 500+ churches already saving time.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full p-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-[#179a65] shadow-lg'
                    : 'text-white hover:text-white/80'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  billingCycle === 'annual'
                    ? 'bg-white text-[#179a65] shadow-lg'
                    : 'text-white hover:text-white/80'
                }`}
              >
                Annual
                <span className="ml-2 text-xs bg-yellow-400 text-gray-900 px-2 py-0.5 rounded-full font-bold">
                  Save 25%+
                </span>
              </button>
            </div>
          </div>
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
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto"
          >
            {sortedOfferings.map((offering, index) => {
              const tierConfig = getTierConfig(offering.tier);
              const quotaHighlights = getQuotaHighlights(offering);
              const hasBadge = (offering.metadata as any)?.badge_text || offering.is_featured;

              return (
                <motion.div
                  key={offering.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  className={`relative ${hasBadge ? 'pt-4' : ''}`}
                >
                  {/* Badge - positioned outside the card */}
                  {hasBadge && (
                    <div className="absolute top-0 left-0 right-0 text-center z-10">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full shadow-lg ${
                        offering.is_featured
                          ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900'
                          : 'bg-white text-[#179a65]'
                      }`}>
                        <Sparkles className="h-3.5 w-3.5" />
                        {(offering.metadata as any)?.badge_text || 'Most Popular'}
                      </span>
                    </div>
                  )}

                  {/* Card */}
                  <div
                    className={`relative flex flex-col h-full rounded-2xl transition-all duration-300 overflow-hidden ${
                      hasBadge ? 'mt-3' : ''
                    } ${
                      offering.is_featured
                        ? 'bg-white text-gray-900 shadow-2xl border-2 border-emerald-400/30'
                        : 'bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20 hover:-translate-y-1'
                    }`}
                  >
                    {/* Decorative top gradient for featured */}
                    {offering.is_featured && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-emerald-300 to-teal-400" />
                    )}

                    <div className="p-6 flex-1 flex flex-col">
                      {/* Tier Icon & Name */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          offering.is_featured
                            ? 'bg-[#179a65]/10 text-[#179a65]'
                            : 'bg-white/20 text-white'
                        }`}>
                          {tierConfig.icon}
                        </div>
                        <div>
                          <h3 className={`text-xl font-bold ${offering.is_featured ? 'text-gray-900' : 'text-white'}`}>
                            {offering.name}
                          </h3>
                          <p className={`text-xs font-medium ${offering.is_featured ? 'text-[#179a65]' : 'text-emerald-200'}`}>
                            {tierConfig.tagline}
                          </p>
                        </div>
                      </div>

                      {/* Best For Tag */}
                      <div className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full mb-4 w-fit ${
                        offering.is_featured
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-white/10 text-white/80'
                      }`}>
                        <Users className="w-3 h-3" />
                        Best for {tierConfig.bestFor}
                      </div>

                      {/* Price */}
                      {offeringDiscounts[offering.id] ? (
                        <div className="mb-4">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className={`text-4xl font-bold tracking-tight ${offering.is_featured ? 'text-gray-900' : 'text-white'}`}>
                              {formatPriceValue(offeringDiscounts[offering.id].discountedPrice, getOfferingPriceRaw(offering)?.currency || 'PHP')}
                            </span>
                            {hasPrice(offering) && (
                              <span className={`text-sm font-medium ${offering.is_featured ? 'text-gray-500' : 'text-white/70'}`}>
                                {getBillingPeriod(offering)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm line-through ${offering.is_featured ? 'text-gray-400' : 'text-white/50'}`}>
                              {formatPrice(offering)}
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              offering.is_featured
                                ? 'bg-red-500 text-white'
                                : 'bg-yellow-400 text-gray-900'
                            }`}>
                              {offeringDiscounts[offering.id].discount.badge_text ||
                               (offeringDiscounts[offering.id].discount.calculation_type === 'percentage'
                                 ? `${offeringDiscounts[offering.id].discount.discount_value}% OFF`
                                 : `Save ${formatPriceValue(offeringDiscounts[offering.id].discountAmount, getOfferingPriceRaw(offering)?.currency || 'PHP')}`
                               )}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-2 mb-4">
                          <span className={`text-4xl font-bold tracking-tight ${offering.is_featured ? 'text-gray-900' : 'text-white'}`}>
                            {formatPrice(offering)}
                          </span>
                          {hasPrice(offering) && (
                            <span className={`text-sm font-medium ${offering.is_featured ? 'text-gray-500' : 'text-white/70'}`}>
                              {getBillingPeriod(offering)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Description */}
                      <p className={`text-sm mb-5 ${offering.is_featured ? 'text-gray-500' : 'text-white/80'}`}>
                        {offering.description}
                      </p>

                      {/* Quota Highlights */}
                      {quotaHighlights.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mb-5">
                          {quotaHighlights.map((highlight, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center gap-2 p-2.5 rounded-lg ${
                                offering.is_featured
                                  ? 'bg-gray-50'
                                  : 'bg-white/10'
                              }`}
                            >
                              <div className={`${offering.is_featured ? 'text-[#179a65]' : 'text-emerald-300'}`}>
                                {highlight.icon}
                              </div>
                              <div>
                                <p className={`text-[10px] uppercase tracking-wider font-medium ${
                                  offering.is_featured ? 'text-gray-500' : 'text-white/70'
                                }`}>
                                  {highlight.label}
                                </p>
                                <p className={`text-xs font-bold ${
                                  offering.is_featured ? 'text-gray-900' : 'text-white'
                                }`}>
                                  {highlight.value}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Divider */}
                      <div className={`border-t mb-5 ${offering.is_featured ? 'border-gray-100' : 'border-white/20'}`} />

                      {/* Key Highlights */}
                      <div className="space-y-2.5 flex-1">
                        {tierConfig.keyHighlights.map((highlight, idx) => (
                          <div key={idx} className="flex items-center gap-2.5">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                              offering.is_featured
                                ? 'bg-[#179a65]/10 text-[#179a65]'
                                : 'bg-emerald-400/20 text-emerald-300'
                            }`}>
                              <Check className="w-3 h-3" />
                            </div>
                            <span className={`text-sm ${offering.is_featured ? 'text-gray-700' : 'text-white'}`}>
                              {highlight}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* "All core features included" note */}
                      <p className={`text-xs mt-4 ${offering.is_featured ? 'text-gray-400' : 'text-white/60'}`}>
                        All core features included
                      </p>
                    </div>

                    {/* CTA Section */}
                    <div className={`p-6 pt-4 ${offering.is_featured ? 'bg-gray-50/50' : 'bg-black/10'}`}>
                      {hasTrial(offering.tier) ? (
                        <div className="space-y-2">
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <button
                              className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                                offering.is_featured
                                  ? 'bg-gradient-to-r from-[#179a65] to-emerald-600 text-white hover:from-[#148054] hover:to-emerald-700'
                                  : 'bg-white text-[#179a65] hover:bg-gray-50'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                              disabled={selectingId !== null}
                              onClick={() => handleSelectPlan(trialOffering!.id)}
                            >
                              {selectingId === trialOffering?.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Starting Trial...
                                </>
                              ) : (
                                <>
                                  {(trialOffering?.metadata as any)?.cta_text || `Start ${trialDays}-Day Free Trial`}
                                  <ArrowRight className="w-4 h-4" />
                                </>
                              )}
                            </button>
                          </motion.div>
                          <button
                            className={`w-full py-2 rounded-lg text-xs font-medium transition-colors text-center ${
                              offering.is_featured
                                ? 'text-gray-500 hover:text-[#179a65]'
                                : 'text-white/70 hover:text-white hover:bg-white/10'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            disabled={selectingId !== null}
                            onClick={() => handleSelectPlan(offering.id)}
                          >
                            {selectingId === offering.id ? (
                              <span className="flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing...
                              </span>
                            ) : (
                              <>or subscribe now <ArrowRight className="inline w-3 h-3 ml-1" /></>
                            )}
                          </button>
                        </div>
                      ) : (
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <button
                            className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                              offering.is_featured
                                ? 'bg-gradient-to-r from-[#179a65] to-emerald-600 text-white hover:from-[#148054] hover:to-emerald-700'
                                : 'bg-white text-[#179a65] hover:bg-gray-50'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            disabled={selectingId !== null}
                            onClick={() => handleSelectPlan(offering.id)}
                          >
                            {selectingId === offering.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Selecting...
                              </>
                            ) : (
                              <>
                                {(offering.metadata as any)?.cta_text || ((offering.metadata as any)?.pricing?.is_free ? 'Get Started Free' : 'Get Started')}
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {!isLoading && sortedOfferings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/80">
              No pricing plans available at this time. Please contact support.
            </p>
          </div>
        )}

        {/* Plan Comparison Matrix */}
        {!isLoading && sortedOfferings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16"
          >
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-white mb-2">Compare All Plans</h3>
              <p className="text-white/70 text-sm">See what&apos;s included in each plan</p>
            </div>
            <PlanComparisonMatrix
              variant="light"
              offerings={allOfferings}
              showPricing={true}
              billingCycle={billingCycle}
            />
          </motion.div>
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
