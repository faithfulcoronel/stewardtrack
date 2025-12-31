"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Check, ArrowRight, Loader2, Sparkles } from "lucide-react";
import type { ProductOfferingWithFeatures } from "@/models/productOffering.model";

export function Pricing() {
  const [offerings, setOfferings] = useState<ProductOfferingWithFeatures[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      }
    } catch (error) {
      console.error('Error loading offerings:', error);
    } finally {
      setIsLoading(false);
    }
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
          <p className="text-xl text-gray-300">
            Get started today with tools built to meet your ministry needs
          </p>
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
                  {offering.is_featured && (
                    <div className="absolute -top-4 left-0 right-0 text-center">
                      <span className="inline-flex items-center gap-1 bg-white text-[#179a65] text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                        <Sparkles className="h-3 w-3" />
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6 pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-2xl font-bold capitalize ${offering.is_featured ? 'text-white' : 'text-[#179a65]'}`}>
                        {offering.tier}
                      </h3>
                      {offering.offering_type === 'trial' && (
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          offering.is_featured ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          Trial
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{formatPrice(offering)}</span>
                      {offering.base_price && offering.base_price > 0 && (
                        <span className={`text-sm ${offering.is_featured ? 'text-green-100' : 'text-gray-500'}`}>
                          {getBillingPeriod(offering)}
                        </span>
                      )}
                    </div>
                    <p className={`mt-4 text-sm ${offering.is_featured ? 'text-green-50' : 'text-gray-500'}`}>
                      {offering.description}
                    </p>
                  </div>

                  <div className="flex-1 mb-8">
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

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link
                      href={`/signup?offering=${offering.id}`}
                      className={`
                        w-full py-3 px-6 rounded-lg font-bold text-sm transition-colors text-center block
                        ${offering.is_featured
                          ? 'bg-white text-[#179a65] hover:bg-gray-50'
                          : 'bg-[#179a65] text-white hover:bg-green-600'
                        }
                      `}
                    >
                      Get Started
                    </Link>
                  </motion.div>
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
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 capitalize">{customOffering.tier}</h3>
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
                      {customOffering.base_price ? formatPrice(customOffering) : 'Contact Us'}
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
