"use client";

import { useState, useEffect, useCallback } from "react";
import { ExpandableText } from "@/components/ui/expandable-text";
import { motion } from "motion/react";
import Link from "next/link";
import { Check, ArrowRight, Loader2, Sparkles, Globe, Users, Zap, Shield, Clock, Heart, Building2, Crown, Infinity } from "lucide-react";
import type { ProductOfferingWithFeatures, ProductOfferingPrice } from "@/models/productOffering.model";
import { PlanComparisonMatrix } from "./PlanComparisonMatrix";
import {
  CurrencyProvider,
  useCurrency,
  formatCurrency,
  SupportedCurrency,
  getCurrencySelectOptions,
} from "@/lib/currency";

interface OfferingDiscount {
  offeringId: string;
  discount: {
    id: string;
    code: string;
    name: string;
    calculation_type: 'percentage' | 'fixed';
    discount_value: number;
    badge_text?: string;
    banner_text?: string;
    ends_at?: string;
  };
  originalPrice: number;
  discountedPrice: number;
  discountAmount: number;
}

function PricingContent() {
  const { currency, setCurrency, isLoading: isCurrencyDetecting } = useCurrency();
  const [allOfferings, setAllOfferings] = useState<ProductOfferingWithFeatures[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [offeringDiscounts, setOfferingDiscounts] = useState<Map<string, OfferingDiscount>>(new Map());

  const loadDiscountForOffering = useCallback(async (offering: ProductOfferingWithFeatures, offeringCurrency: string) => {
    try {
      const anyOffering = offering as any;
      const price = anyOffering.resolved_price ?? anyOffering.prices?.[0]?.price ?? 0;

      if (price <= 0) return null;

      const response = await fetch('/api/licensing/discounts/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offeringId: offering.id,
          amount: price,
          currency: offeringCurrency,
        }),
      });

      if (!response.ok) return null;

      const result = await response.json();
      // API returns data wrapped in a `data` object
      const data = result.data || result;
      if (result.success && data.discount) {
        return {
          offeringId: offering.id,
          discount: data.discount,
          originalPrice: data.originalPrice,
          discountedPrice: data.discountedPrice,
          discountAmount: data.discountAmount,
        } as OfferingDiscount;
      }
      return null;
    } catch (error) {
      console.error('Error loading discount for offering:', error);
      return null;
    }
  }, []);

  const loadOfferings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/licensing/product-offerings?withFeatures=true&currency=${currency}`);
      const result = await response.json();

      if (result.success) {
        const activeOfferings = result.data.filter((o: ProductOfferingWithFeatures) => o.is_active);
        setAllOfferings(activeOfferings);

        // Load discounts for all offerings in parallel
        const discountPromises = activeOfferings.map((offering: ProductOfferingWithFeatures) =>
          loadDiscountForOffering(offering, currency)
        );
        const discountResults = await Promise.all(discountPromises);

        const discountsMap = new Map<string, OfferingDiscount>();
        discountResults.forEach((discount) => {
          if (discount) {
            discountsMap.set(discount.offeringId, discount);
          }
        });
        setOfferingDiscounts(discountsMap);
      }
    } catch (error) {
      console.error('Error loading offerings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currency, loadDiscountForOffering]);

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
    if (!isCurrencyDetecting) {
      loadOfferings();
    }
  }, [loadOfferings, isCurrencyDetecting]);

  /**
   * Get the price for an offering in the current currency.
   * Uses resolved_price from API if available, otherwise looks up from prices array.
   */
  function getOfferingPrice(offering: ProductOfferingWithFeatures): { price: number; currency: string } | null {
    // First try resolved_price from API (set during currency detection)
    const anyOffering = offering as any;
    if (anyOffering.resolved_price !== undefined && anyOffering.resolved_price !== null) {
      return {
        price: anyOffering.resolved_price,
        currency: anyOffering.resolved_currency || currency,
      };
    }

    // Fall back to prices array if available
    const prices: ProductOfferingPrice[] = anyOffering.prices || [];
    if (prices.length > 0) {
      // Try to find price in current currency
      const priceInCurrency = prices.find(p => p.currency === currency && p.is_active);
      if (priceInCurrency) {
        return { price: priceInCurrency.price, currency: priceInCurrency.currency };
      }
      // Fall back to first active price
      const firstActivePrice = prices.find(p => p.is_active);
      if (firstActivePrice) {
        return { price: firstActivePrice.price, currency: firstActivePrice.currency };
      }
    }

    return null;
  }

  function formatPrice(offering: ProductOfferingWithFeatures): string {
    const priceInfo = getOfferingPrice(offering);

    if (!priceInfo || priceInfo.price === 0) {
      return 'Free';
    }

    return formatCurrency(priceInfo.price, priceInfo.currency as SupportedCurrency);
  }

  function hasPrice(offering: ProductOfferingWithFeatures): boolean {
    const priceInfo = getOfferingPrice(offering);
    return priceInfo !== null && priceInfo.price > 0;
  }

  const currencyOptions = getCurrencySelectOptions();

  function getBillingPeriod(offering: ProductOfferingWithFeatures): string {
    if (!offering.billing_cycle) return '';

    const periods: Record<string, string> = {
      monthly: '/month',
      annual: '/year',
      lifetime: 'one-time',
    };

    return periods[offering.billing_cycle] || '';
  }

  const tierOrder = ['essential', 'premium', 'professional', 'enterprise', 'custom'];
  const sortedOfferings = [...offerings].sort((a, b) => {
    return tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
  });

  // Separate custom tier from regular offerings
  const regularOfferings = sortedOfferings.filter(o => o.tier !== 'custom');
  const customOffering = sortedOfferings.find(o => o.tier === 'custom');

  // Tier-specific value propositions and icons - Focus on differentiators
  const getTierConfig = (tier: string) => {
    const configs: Record<string, {
      icon: React.ReactNode;
      tagline: string;
      bestFor: string;
      keyHighlights: string[];
      gradient?: string;
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
        gradient: 'from-[#179a65] via-emerald-500 to-teal-600',
      },
      enterprise: {
        icon: <Building2 className="w-5 h-5" />,
        tagline: 'Scale Without Limits',
        bestFor: 'Large & multi-campus',
        keyHighlights: ['Unlimited everything', 'Multi-center support', 'API access & integrations'],
      },
    };
    return configs[tier] || configs.essential;
  };

  // Get key quota highlights for a tier
  const getQuotaHighlights = (offering: ProductOfferingWithFeatures) => {
    const highlights: { icon: React.ReactNode; label: string; value: string }[] = [];

    // Members
    if (offering.max_members === null) {
      highlights.push({ icon: <Users className="w-4 h-4" />, label: 'Members', value: 'Unlimited' });
    } else if (offering.max_members && offering.max_members > 0) {
      highlights.push({ icon: <Users className="w-4 h-4" />, label: 'Members', value: `Up to ${offering.max_members.toLocaleString()}` });
    }

    // Storage
    if ((offering as any).max_storage_mb === null) {
      highlights.push({ icon: <Shield className="w-4 h-4" />, label: 'Storage', value: 'Unlimited' });
    } else if ((offering as any).max_storage_mb && (offering as any).max_storage_mb > 0) {
      const storageMB = (offering as any).max_storage_mb;
      const storageText = storageMB >= 1024 ? `${(storageMB / 1024).toFixed(0)} GB` : `${storageMB} MB`;
      highlights.push({ icon: <Shield className="w-4 h-4" />, label: 'Storage', value: storageText });
    }

    return highlights.slice(0, 2); // Max 2 highlights
  };

  return (
    <section className="py-24 bg-gray-900 relative overflow-hidden" id="pricing">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 opacity-50 pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16 text-white"
        >
          {/* Social Proof Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#179a65]/20 to-emerald-500/20 border border-[#179a65]/30 rounded-full px-5 py-2 mb-6"
          >
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-gray-900" />
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 border-2 border-gray-900" />
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 border-2 border-gray-900" />
            </div>
            <span className="text-sm font-medium text-gray-300">
              Trusted by <span className="text-[#179a65] font-bold">500+</span> churches worldwide
            </span>
          </motion.div>

          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Pricing That <span className="bg-gradient-to-r from-[#179a65] to-emerald-400 bg-clip-text text-transparent">Grows With You</span>
          </h2>
          <p className="text-xl text-gray-300 mb-4 max-w-2xl mx-auto">
            Start free forever, upgrade when you&apos;re ready. Every plan includes our core church management features.
          </p>

          {/* Trust Signals */}
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400 mb-8">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-[#179a65]" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#179a65]" />
              {trialDays}-day free trial on paid plans
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#179a65]" />
              30-day money-back guarantee
            </span>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="inline-flex items-center bg-gray-800/80 border border-gray-600 rounded-full p-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-[#179a65] text-white shadow-lg'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  billingCycle === 'annual'
                    ? 'bg-[#179a65] text-white shadow-lg'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Annual
                <span className="ml-2 text-xs bg-yellow-500 text-gray-900 px-2 py-0.5 rounded-full font-bold">
                  Save 25%+
                </span>
              </button>
            </div>
          </div>

          {/* Currency Selector */}
          <div className="relative inline-block">
            <button
              onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200 transition-colors"
            >
              <Globe className="h-4 w-4" />
              <span>{currency}</span>
              <svg className={`h-4 w-4 transition-transform ${showCurrencyDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showCurrencyDropdown && (
              <div className="absolute z-50 mt-2 w-64 max-h-80 overflow-y-auto bg-gray-800 border border-gray-600 rounded-lg shadow-xl">
                <div className="p-2">
                  {currencyOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setCurrency(option.value as SupportedCurrency);
                        setShowCurrencyDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        currency === option.value
                          ? 'bg-[#179a65] text-white'
                          : 'text-gray-200 hover:bg-gray-700'
                      }`}
                    >
                      <span className="font-medium">{option.value}</span>
                      <span className="text-gray-400 ml-2">- {option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-[#179a65]" />
          </div>
        ) : (
          <>
            {/* Main Grid Plans */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${regularOfferings.length >= 3 ? 'lg:grid-cols-3' : ''} ${regularOfferings.length >= 4 ? 'xl:grid-cols-4' : ''} gap-6 max-w-7xl mx-auto mb-8`}>
              {regularOfferings.map((offering, i) => {
                const tierConfig = getTierConfig(offering.tier);
                const quotaHighlights = getQuotaHighlights(offering);
                const hasBadge = (offering.metadata as any)?.badge_text || offering.is_featured;

                return (
                  <motion.div
                    key={offering.id}
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    whileInView={{ opacity: 1, y: 0, scale: offering.is_featured ? 1.02 : 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className={`relative ${hasBadge ? 'pt-4' : ''}`}
                  >
                    {/* Badge - positioned outside the card to avoid overflow clipping */}
                    {hasBadge && (
                      <div className="absolute top-0 left-0 right-0 text-center z-10">
                        <motion.span
                          initial={{ scale: 0.8, opacity: 0 }}
                          whileInView={{ scale: 1, opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3 + i * 0.1 }}
                          className={`inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full shadow-lg ${
                            offering.is_featured
                              ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900'
                              : 'bg-white text-[#179a65] border border-gray-200'
                          }`}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {(offering.metadata as any)?.badge_text || 'Most Popular'}
                        </motion.span>
                      </div>
                    )}

                    {/* Card */}
                    <div
                      className={`
                        relative flex flex-col w-full h-full rounded-2xl transition-all duration-300 overflow-hidden
                        ${hasBadge ? 'mt-3' : ''}
                        ${offering.is_featured
                          ? 'bg-gradient-to-br from-[#179a65] via-emerald-600 to-teal-700 text-white shadow-2xl shadow-[#179a65]/25 border-2 border-emerald-400/30 md:-translate-y-4'
                          : 'bg-white text-gray-900 border border-gray-200 hover:shadow-2xl hover:shadow-gray-900/10 hover:-translate-y-2 hover:border-[#179a65]/30'
                        }
                      `}
                    >
                      {/* Decorative top gradient for featured */}
                      {offering.is_featured && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-emerald-300 to-teal-400" />
                      )}

                    <div className="p-6 pt-6">
                      {/* Tier Icon & Name */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          offering.is_featured
                            ? 'bg-white/20 text-white'
                            : 'bg-[#179a65]/10 text-[#179a65]'
                        }`}>
                          {tierConfig.icon}
                        </div>
                        <div>
                          <h3 className={`text-xl font-bold ${offering.is_featured ? 'text-white' : 'text-gray-900'}`}>
                            {offering.name}
                          </h3>
                          <p className={`text-xs font-medium ${offering.is_featured ? 'text-emerald-200' : 'text-[#179a65]'}`}>
                            {tierConfig.tagline}
                          </p>
                        </div>
                      </div>

                      {/* Best For Tag */}
                      <div className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full mb-4 ${
                        offering.is_featured
                          ? 'bg-white/10 text-emerald-100'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <Users className="w-3 h-3" />
                        Best for {tierConfig.bestFor}
                      </div>

                      {/* Price Section */}
                      {(() => {
                        const discount = offeringDiscounts.get(offering.id);
                        const priceInfo = getOfferingPrice(offering);

                        if (discount) {
                          const badgeText = discount.discount.badge_text ||
                            (discount.discount.calculation_type === 'percentage'
                              ? `${discount.discount.discount_value}% OFF`
                              : `Save ${formatCurrency(discount.discountAmount, priceInfo?.currency as SupportedCurrency || currency)}`);

                          return (
                            <div className="mb-4">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className={`text-4xl font-bold tracking-tight ${offering.is_featured ? 'text-white' : 'text-gray-900'}`}>
                                  {formatCurrency(discount.discountedPrice, priceInfo?.currency as SupportedCurrency || currency)}
                                </span>
                                {hasPrice(offering) && (
                                  <span className={`text-sm font-medium ${offering.is_featured ? 'text-emerald-200' : 'text-gray-500'}`}>
                                    {getBillingPeriod(offering)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm line-through ${offering.is_featured ? 'text-emerald-200/60' : 'text-gray-400'}`}>
                                  {formatCurrency(discount.originalPrice, priceInfo?.currency as SupportedCurrency || currency)}
                                </span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  offering.is_featured
                                    ? 'bg-yellow-400 text-gray-900'
                                    : 'bg-red-500 text-white'
                                }`}>
                                  {badgeText}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div className="flex items-baseline gap-2 mb-4">
                            <span className={`text-4xl font-bold tracking-tight ${offering.is_featured ? 'text-white' : 'text-gray-900'}`}>
                              {formatPrice(offering)}
                            </span>
                            {hasPrice(offering) && (
                              <span className={`text-sm font-medium ${offering.is_featured ? 'text-emerald-200' : 'text-gray-500'}`}>
                                {getBillingPeriod(offering)}
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      {/* Description */}
                      {offering.description && (
                        <div className="mb-5">
                          <ExpandableText
                            text={offering.description}
                            maxLines={4}
                            className={`text-sm ${offering.is_featured ? 'text-emerald-100' : 'text-gray-500'}`}
                            toggleClassName={offering.is_featured ? 'text-emerald-200 hover:text-white' : 'text-[#179a65] hover:text-[#127a4e]'}
                          />
                        </div>
                      )}

                      {/* Quota Highlights - Visual Cards */}
                      {quotaHighlights.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mb-5">
                          {quotaHighlights.map((highlight, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center gap-2 p-2.5 rounded-lg ${
                                offering.is_featured
                                  ? 'bg-white/10'
                                  : 'bg-gray-50'
                              }`}
                            >
                              <div className={`${offering.is_featured ? 'text-emerald-300' : 'text-[#179a65]'}`}>
                                {highlight.icon}
                              </div>
                              <div>
                                <p className={`text-[10px] uppercase tracking-wider font-medium ${
                                  offering.is_featured ? 'text-emerald-200' : 'text-gray-500'
                                }`}>
                                  {highlight.label}
                                </p>
                                <p className={`text-xs font-bold ${
                                  offering.is_featured ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {highlight.value}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Divider */}
                      <div className={`border-t mb-5 ${offering.is_featured ? 'border-white/20' : 'border-gray-100'}`} />

                      {/* Key Highlights - What makes this tier special */}
                      <div className="space-y-2.5">
                        {tierConfig.keyHighlights.map((highlight, idx) => (
                          <div key={idx} className="flex items-center gap-2.5">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                              offering.is_featured
                                ? 'bg-emerald-400/20 text-emerald-300'
                                : 'bg-[#179a65]/10 text-[#179a65]'
                            }`}>
                              <Check className="w-3 h-3" />
                            </div>
                            <span className={`text-sm ${offering.is_featured ? 'text-white' : 'text-gray-700'}`}>
                              {highlight}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* "All core features included" note */}
                      <p className={`text-xs mt-4 ${offering.is_featured ? 'text-emerald-200/70' : 'text-gray-400'}`}>
                        All core features included
                      </p>
                    </div>

                    {/* CTA Section - Sticky at bottom */}
                    <div className={`mt-auto p-6 pt-4 ${offering.is_featured ? 'bg-black/10' : 'bg-gray-50/50'}`}>
                      {hasTrial(offering.tier) ? (
                        <div className="space-y-2">
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Link
                              href={`/signup/register?offering=${trialOffering!.id}`}
                              className={`
                                w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all text-center block shadow-lg
                                ${offering.is_featured
                                  ? 'bg-white text-[#179a65] hover:bg-gray-50 shadow-white/20'
                                  : 'bg-gradient-to-r from-[#179a65] to-emerald-600 text-white hover:from-[#148054] hover:to-emerald-700 shadow-[#179a65]/20'
                                }
                              `}
                            >
                              {(trialOffering?.metadata as any)?.cta_text || `Start ${trialDays}-Day Free Trial`}
                            </Link>
                          </motion.div>
                          <Link
                            href={`/signup/register?offering=${offering.id}`}
                            className={`w-full py-2 rounded-lg text-xs font-medium transition-colors text-center block ${
                              offering.is_featured
                                ? 'text-emerald-200 hover:text-white hover:bg-white/10'
                                : 'text-gray-500 hover:text-[#179a65]'
                            }`}
                          >
                            or subscribe now <ArrowRight className="inline w-3 h-3 ml-1" />
                          </Link>
                        </div>
                      ) : (
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Link
                            href={`/signup/register?offering=${offering.id}`}
                            className={`
                              w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all text-center block shadow-lg flex items-center justify-center gap-2
                              ${offering.is_featured
                                ? 'bg-white text-[#179a65] hover:bg-gray-50 shadow-white/20'
                                : 'bg-gradient-to-r from-[#179a65] to-emerald-600 text-white hover:from-[#148054] hover:to-emerald-700 shadow-[#179a65]/20'
                              }
                            `}
                          >
                            {(offering.metadata as any)?.cta_text || ((offering.metadata as any)?.pricing?.is_free ? 'Get Started Free' : 'Get Started')}
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </motion.div>
                      )}
                    </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Custom/Enterprise Plan - Full Width Banner */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="max-w-7xl mx-auto relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-800 to-gray-900 rounded-2xl" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(23,154,101,0.15),transparent_50%)] rounded-2xl" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#179a65]/10 rounded-full blur-3xl" />

              <div className="relative rounded-2xl border border-gray-700/50 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 bg-[#179a65]/10 border border-[#179a65]/30 rounded-full px-4 py-1.5 mb-4">
                    <Building2 className="w-4 h-4 text-[#179a65]" />
                    <span className="text-sm font-medium text-[#179a65]">Enterprise Solution</span>
                  </div>

                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                    {customOffering?.name || 'Need a Custom Solution?'}
                  </h3>
                  <p className="text-gray-400 mb-6 max-w-xl text-lg">
                    {customOffering?.description || 'For large churches and denominations with unique requirements. Get unlimited access, dedicated support, and custom integrations.'}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {(customOffering?.features?.slice(0, 6) || [
                      { id: '1', name: 'Unlimited Everything' },
                      { id: '2', name: 'Multi-Campus Support' },
                      { id: '3', name: 'Dedicated Account Manager' },
                      { id: '4', name: 'Custom API Integrations' },
                      { id: '5', name: 'Priority 24/7 Support' },
                      { id: '6', name: 'Custom Branding' },
                    ]).map((feature: any) => (
                      <div key={feature.id} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-[#179a65]/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-[#179a65]" />
                        </div>
                        <span className="text-sm text-gray-300">{feature.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4 min-w-[220px]">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">Starting at</p>
                    <span className="block text-3xl font-bold text-white">
                      {customOffering && hasPrice(customOffering) ? formatPrice(customOffering) : 'Custom Pricing'}
                    </span>
                    <p className="text-sm text-gray-500">per month</p>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-gradient-to-r from-[#179a65] to-emerald-600 text-white font-bold py-3.5 px-8 rounded-xl hover:from-[#148054] hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#179a65]/20"
                  >
                    Talk to Sales <ArrowRight size={18} />
                  </motion.button>

                  <p className="text-xs text-gray-500 text-center">
                    Free consultation &bull; No commitment
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Plan Comparison Matrix */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="max-w-7xl mx-auto mt-20"
            >
              <div className="text-center mb-10">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="inline-flex items-center gap-2 bg-gray-800/50 border border-gray-700 rounded-full px-4 py-1.5 mb-4"
                >
                  <Infinity className="w-4 h-4 text-[#179a65]" />
                  <span className="text-sm text-gray-400">Detailed Comparison</span>
                </motion.div>
                <h3 className="text-3xl font-bold text-white mb-3">
                  Compare <span className="text-[#179a65]">Every Feature</span>
                </h3>
                <p className="text-gray-400 max-w-xl mx-auto">
                  All plans include our core church management features. See the complete breakdown of limits and premium features below.
                </p>
              </div>
              <PlanComparisonMatrix
                variant="dark"
                offerings={allOfferings}
                showPricing={true}
                billingCycle={billingCycle}
              />
            </motion.div>
          </>
        )}

        {!isLoading && sortedOfferings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">
              No pricing plans available at this time. Please contact support.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Pricing component with dynamic multi-currency support.
 * Automatically detects user's location and displays prices in local currency.
 */
export function Pricing() {
  return (
    <CurrencyProvider>
      <PricingContent />
    </CurrencyProvider>
  );
}
