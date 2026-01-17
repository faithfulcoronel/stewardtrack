"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Check, ArrowRight, Loader2, Sparkles, Globe } from "lucide-react";
import type { ProductOfferingWithFeatures, ProductOfferingPrice } from "@/models/productOffering.model";
import {
  CurrencyProvider,
  useCurrency,
  formatCurrency,
  SupportedCurrency,
  getCurrencySelectOptions,
} from "@/lib/currency";
import { Badge } from "@/components/ui/badge";

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
  const trialDays = (trialOffering as any)?.trial_days || 14;

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
          <h2 className="text-4xl font-bold mb-4">
            Find the <span className="text-[#179a65]">Right Plan</span> for Your Church
          </h2>
          <p className="text-xl text-gray-300 mb-6">
            Get started today with tools built to meet your ministry needs
          </p>

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
              {regularOfferings.map((offering, i) => (
                <motion.div
                  key={offering.id}
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: offering.is_featured ? 1.05 : 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={`
                    relative flex flex-col w-full rounded-2xl p-6 transition-all duration-300
                    ${offering.is_featured
                      ? 'bg-gradient-to-b from-[#179a65] to-green-700 text-white shadow-2xl z-20 border-none transform md:-translate-y-4'
                      : 'bg-white text-gray-900 border border-gray-200 hover:shadow-xl hover:-translate-y-1'
                    }
                  `}
                >
                  {/* Badge - from metadata or default for featured */}
                  {((offering.metadata as any)?.badge_text || offering.is_featured) && (
                    <div className="absolute -top-4 left-0 right-0 text-center">
                      <span className="inline-flex items-center gap-1 bg-white text-[#179a65] text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                        <Sparkles className="h-3 w-3" />
                        {(offering.metadata as any)?.badge_text || 'Most Popular'}
                      </span>
                    </div>
                  )}

                  <div className="mb-6 pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-2xl font-bold ${offering.is_featured ? 'text-white' : 'text-[#179a65]'}`}>
                        {offering.name}
                      </h3>
                      {offering.offering_type === 'trial' && (
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          offering.is_featured ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          Trial
                        </span>
                      )}
                    </div>
                    {/* Highlight text from metadata */}
                    {(offering.metadata as any)?.highlight_text && (
                      <p className={`text-xs font-semibold mb-2 ${offering.is_featured ? 'text-yellow-300' : 'text-orange-500'}`}>
                        {(offering.metadata as any).highlight_text}
                      </p>
                    )}
                    {/* Price with discount display */}
                    {(() => {
                      const discount = offeringDiscounts.get(offering.id);
                      const priceInfo = getOfferingPrice(offering);

                      if (discount) {
                        // Get badge text - prefer badge_text, then calculate
                        const badgeText = discount.discount.badge_text ||
                          (discount.discount.calculation_type === 'percentage'
                            ? `${discount.discount.discount_value}% OFF`
                            : `Save ${formatCurrency(discount.discountAmount, priceInfo?.currency as SupportedCurrency || currency)}`);

                        return (
                          <div className="space-y-2">
                            {/* Discounted price first - more prominent */}
                            <div className="flex items-baseline gap-2">
                              <span className={`text-3xl font-bold ${offering.is_featured ? 'text-white' : 'text-gray-900'}`}>
                                {formatCurrency(discount.discountedPrice, priceInfo?.currency as SupportedCurrency || currency)}
                              </span>
                              {hasPrice(offering) && (
                                <span className={`text-sm ${offering.is_featured ? 'text-green-100' : 'text-gray-500'}`}>
                                  {getBillingPeriod(offering)}
                                </span>
                              )}
                            </div>
                            {/* Original price with strikethrough and badge */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-base line-through ${offering.is_featured ? 'text-green-200/70' : 'text-gray-400'}`}>
                                {formatCurrency(discount.originalPrice, priceInfo?.currency as SupportedCurrency || currency)}
                              </span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                offering.is_featured
                                  ? 'bg-yellow-400 text-gray-900'
                                  : 'bg-red-500 text-white'
                              }`}>
                                {badgeText}
                              </span>
                            </div>
                            {/* Discount name/promo */}
                            {discount.discount.name && (
                              <p className={`text-xs font-medium ${offering.is_featured ? 'text-yellow-300' : 'text-red-500'}`}>
                                {discount.discount.name}
                              </p>
                            )}
                          </div>
                        );
                      }

                      // No discount - show regular price
                      return (
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold">{formatPrice(offering)}</span>
                          {hasPrice(offering) && (
                            <span className={`text-sm ${offering.is_featured ? 'text-green-100' : 'text-gray-500'}`}>
                              {getBillingPeriod(offering)}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    <p className={`mt-4 text-sm ${offering.is_featured ? 'text-green-50' : 'text-gray-500'}`}>
                      {offering.description}
                    </p>
                  </div>

                  <div className="flex-1 mb-8">
                    {/* Features headline from metadata */}
                    {(offering.metadata as any)?.features_headline && (
                      <p className={`text-xs font-semibold mb-3 ${offering.is_featured ? 'text-green-100' : 'text-gray-500'}`}>
                        {(offering.metadata as any).features_headline}
                      </p>
                    )}
                    <ul className="space-y-3">
                      {offering.max_users && (
                        <li className="flex items-start gap-3 text-sm">
                          <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${offering.is_featured ? 'text-green-200' : 'text-[#179a65]'}`} />
                          <span>Up to {offering.max_users} users</span>
                        </li>
                      )}
                      {!offering.max_users && (
                        <li className="flex items-start gap-3 text-sm">
                          <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${offering.is_featured ? 'text-green-200' : 'text-[#179a65]'}`} />
                          <span>Unlimited users</span>
                        </li>
                      )}
                      {offering.features && offering.features.slice(0, 5).map((feature) => (
                        <li key={feature.id} className="flex items-start gap-3 text-sm">
                          <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${offering.is_featured ? 'text-green-200' : 'text-[#179a65]'}`} />
                          <span>{feature.name}</span>
                        </li>
                      ))}
                      {offering.features && offering.features.length > 5 && (
                        <li className={`text-sm italic pl-7 ${offering.is_featured ? 'text-green-200' : 'text-gray-400'}`}>
                          + {offering.features.length - 5} more features
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* CTA Buttons */}
                  {hasTrial(offering.tier) ? (
                    <div className="space-y-2">
                      {/* Primary: Start Free Trial */}
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Link
                          href={`/signup/register?offering=${trialOffering!.id}`}
                          className={`
                            w-full py-3 px-6 rounded-lg font-bold text-sm transition-colors text-center block
                            ${offering.is_featured
                              ? 'bg-white text-[#179a65] hover:bg-gray-50'
                              : 'bg-[#179a65] text-white hover:bg-green-600'
                            }
                          `}
                        >
                          {(trialOffering?.metadata as any)?.cta_text || `Start ${trialDays}-Day Free Trial`}
                        </Link>
                      </motion.div>
                      {/* Secondary: Subscribe directly */}
                      <Link
                        href={`/signup/register?offering=${offering.id}`}
                        className={`
                          w-full py-2 px-6 rounded-lg text-xs font-medium transition-colors text-center block
                          ${offering.is_featured
                            ? 'text-gray-400 hover:text-white hover:bg-white/10'
                            : 'text-gray-400 hover:text-white hover:bg-white/10'
                          }
                        `}
                      >
                        or Subscribe Now
                      </Link>
                    </div>
                  ) : (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Link
                        href={`/signup/register?offering=${offering.id}`}
                        className={`
                          w-full py-3 px-6 rounded-lg font-bold text-sm transition-colors text-center block
                          ${offering.is_featured
                            ? 'bg-white text-[#179a65] hover:bg-gray-50'
                            : 'bg-[#179a65] text-white hover:bg-green-600'
                          }
                        `}
                      >
                        {(offering.metadata as any)?.cta_text || ((offering.metadata as any)?.pricing?.is_free ? 'Get Started Free' : 'Get Started')}
                      </Link>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Custom Plan - Full Width Banner */}
            {customOffering && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="max-w-7xl mx-auto bg-gradient-to-r from-gray-800 to-gray-800 border border-gray-700 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 hover:border-[#179a65]/50 transition-colors"
              >
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">{customOffering.name}</h3>
                  <p className="text-gray-400 mb-6 max-w-xl">{customOffering.description}</p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-3">
                    {customOffering.features && customOffering.features.slice(0, 5).map((feature) => (
                      <div key={feature.id} className="flex items-center gap-2 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-[#179a65]" />
                        <span>{feature.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-center md:items-end gap-4 min-w-[200px]">
                  <div className="text-center md:text-right">
                    <span className="block text-2xl font-bold text-white">
                      {hasPrice(customOffering) ? formatPrice(customOffering) : 'Contact Us'}
                    </span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-transparent border-2 border-[#179a65] text-green-400 font-bold py-3 px-8 rounded-lg hover:bg-[#179a65] hover:text-white transition-all flex items-center gap-2"
                  >
                    Contact Sales <ArrowRight size={18} />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Fallback custom plan if no custom offering exists */}
            {!customOffering && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="max-w-7xl mx-auto bg-gradient-to-r from-gray-800 to-gray-800 border border-gray-700 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 hover:border-[#179a65]/50 transition-colors"
              >
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Custom</h3>
                  <p className="text-gray-400 mb-6 max-w-xl">For unique church needs with tailored solutions. Get unlimited access and premium support.</p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-3">
                    {['Unlimited member profiles', 'Unlimited transactions', 'Dedicated Account Manager', 'Custom API Integrations', 'Everything in Premium'].map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-[#179a65]" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-center md:items-end gap-4 min-w-[200px]">
                  <div className="text-center md:text-right">
                    <span className="block text-2xl font-bold text-white">Contact Us</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-transparent border-2 border-[#179a65] text-green-400 font-bold py-3 px-8 rounded-lg hover:bg-[#179a65] hover:text-white transition-all flex items-center gap-2"
                  >
                    Contact Sales <ArrowRight size={18} />
                  </motion.button>
                </div>
              </motion.div>
            )}
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
