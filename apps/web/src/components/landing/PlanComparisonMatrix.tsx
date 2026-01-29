"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  X,
  Loader2,
  Users,
  Shield,
  HardDrive,
  MessageSquare,
  Mail,
  CreditCard,
  Sparkles,
  Heart,
  Zap,
  Crown,
  Building2,
  Star,
  TrendingUp,
  Cpu,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import type { ProductOfferingWithFeatures } from "@/models/productOffering.model";
import {
  useCurrency,
  formatCurrency,
  SupportedCurrency,
} from "@/lib/currency";

interface QuotaRowConfig {
  key: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: 'quotas' | 'features';
  formatValue?: (value: number | null | undefined) => string | React.ReactNode;
}

// Configuration for quota display rows with icons
const QUOTA_ROWS: QuotaRowConfig[] = [
  {
    key: 'max_members',
    label: 'Church Members',
    description: 'Active members in your database',
    icon: <Users className="w-4 h-4" />,
    category: 'quotas',
  },
  {
    key: 'max_admin_users',
    label: 'Admin Users',
    description: 'Staff with admin access',
    icon: <Shield className="w-4 h-4" />,
    category: 'quotas',
  },
  {
    key: 'max_storage_mb',
    label: 'Storage',
    description: 'Media and file storage',
    icon: <HardDrive className="w-4 h-4" />,
    category: 'quotas',
  },
  {
    key: 'max_sms_per_month',
    label: 'SMS Messages',
    description: 'Per month',
    icon: <MessageSquare className="w-4 h-4" />,
    category: 'quotas',
  },
  {
    key: 'max_emails_per_month',
    label: 'Emails',
    description: 'Per month',
    icon: <Mail className="w-4 h-4" />,
    category: 'quotas',
  },
  {
    key: 'max_transactions_per_month',
    label: 'Transactions',
    description: 'Financial transactions per month',
    icon: <CreditCard className="w-4 h-4" />,
    category: 'quotas',
  },
  {
    key: 'max_ai_credits_per_month',
    label: 'AI Credits',
    description: 'Monthly AI assistance credits',
    icon: <Cpu className="w-4 h-4" />,
    category: 'quotas',
  },
];

// Premium features that differ by tier
const FEATURE_ROWS: QuotaRowConfig[] = [
  {
    key: 'online_donations',
    label: 'Online Donations',
    description: 'Accept tithes & offerings online',
    icon: <CreditCard className="w-4 h-4" />,
    category: 'features',
  },
  {
    key: 'event_payments',
    label: 'Event Payments',
    description: 'Collect registration fees online',
    icon: <CreditCard className="w-4 h-4" />,
    category: 'features',
  },
  {
    key: 'import_export',
    label: 'Import/Export',
    description: 'Bulk data operations',
    icon: <TrendingUp className="w-4 h-4" />,
    category: 'features',
  },
  {
    key: 'pdf_downloads',
    label: 'PDF Downloads',
    description: 'Generate PDF reports',
    icon: <TrendingUp className="w-4 h-4" />,
    category: 'features',
  },
  {
    key: 'specialized_reports',
    label: 'Specialized Reports',
    description: 'Advanced analytics',
    icon: <TrendingUp className="w-4 h-4" />,
    category: 'features',
  },
  {
    key: 'facebook_integration',
    label: 'Facebook Integration',
    description: 'Post content, images & videos to Facebook',
    icon: <MessageSquare className="w-4 h-4" />,
    category: 'features',
  },
  {
    key: 'ai_chat',
    label: 'AI Chat Assistant',
    description: 'AI-powered help',
    icon: <Sparkles className="w-4 h-4" />,
    category: 'features',
  },
  {
    key: 'ai_compose',
    label: 'AI Compose',
    description: 'AI content generation',
    icon: <Sparkles className="w-4 h-4" />,
    category: 'features',
  },
  {
    key: 'multi_campus',
    label: 'Multi-Center',
    description: 'Manage multiple center locations',
    icon: <Building2 className="w-4 h-4" />,
    category: 'features',
  },
  {
    key: 'api_access',
    label: 'API Access',
    description: 'Developer integrations',
    icon: <Cpu className="w-4 h-4" />,
    category: 'features',
  },
  {
    key: 'priority_support',
    label: 'Priority Support',
    description: 'Dedicated support',
    icon: <Star className="w-4 h-4" />,
    category: 'features',
  },
];

// Mapping from feature keys to potential feature codes in the database
const FEATURE_CODE_MAPPINGS: Record<string, string[]> = {
  'online_donations': ['online_donations', 'online_giving', 'digital_donations', 'payment_processing', 'online.donations'],
  'event_payments': ['event_payments', 'event_registration', 'registration_fees', 'online_registration', 'event.payments'],
  'import_export': ['import_export', 'data_import', 'data_export', 'bulk_import', 'excel.importexport'],
  'pdf_downloads': ['pdf_downloads', 'pdf_export', 'pdf_reports', 'pdf.downloads'],
  'specialized_reports': ['specialized_reports', 'advanced_reports', 'custom_reports', 'member_reports', 'advanced.reports'],
  'facebook_integration': ['facebook_integration', 'facebook_posting', 'social_media_integration', 'facebook_pages', 'facebook.integration'],
  'ai_chat': ['ai_chat', 'ai_assistant', 'ai_help', 'ai.assistant'],
  'ai_compose': ['ai_compose', 'ai_content', 'ai_writing', 'ai.integration'],
  'multi_campus': ['multi_campus', 'multiple_campuses', 'campus_management', 'multi.center'],
  'api_access': ['api_access', 'developer_api', 'rest_api'],
  'priority_support': ['priority_support', 'premium_support', 'dedicated_support'],
};

// Tier configuration for icons and styling
const TIER_CONFIG: Record<string, { icon: React.ReactNode; gradient: string; color: string; bgLight: string }> = {
  essential: {
    icon: <Heart className="w-5 h-5" />,
    gradient: 'from-gray-400 to-gray-500',
    color: 'text-gray-400',
    bgLight: 'bg-gray-500/10'
  },
  premium: {
    icon: <Zap className="w-5 h-5" />,
    gradient: 'from-blue-400 to-blue-600',
    color: 'text-blue-400',
    bgLight: 'bg-blue-500/10'
  },
  professional: {
    icon: <Crown className="w-5 h-5" />,
    gradient: 'from-emerald-400 to-teal-500',
    color: 'text-emerald-400',
    bgLight: 'bg-emerald-500/10'
  },
  enterprise: {
    icon: <Building2 className="w-5 h-5" />,
    gradient: 'from-purple-400 to-purple-600',
    color: 'text-purple-400',
    bgLight: 'bg-purple-500/10'
  },
};

interface PlanComparisonMatrixProps {
  variant?: 'dark' | 'light';
  showCategories?: ('quotas' | 'features')[];
  offerings?: ProductOfferingWithFeatures[];
  showPricing?: boolean;
  billingCycle?: 'monthly' | 'annual';
}

export function PlanComparisonMatrix({
  variant = 'dark',
  showCategories = ['quotas', 'features'],
  offerings: providedOfferings,
  showPricing = true,
  billingCycle = 'monthly',
}: PlanComparisonMatrixProps) {
  const { currency } = useCurrency();
  const [offerings, setOfferings] = useState<ProductOfferingWithFeatures[]>(providedOfferings || []);
  const [isLoading, setIsLoading] = useState(!providedOfferings);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [expandedMobileCard, setExpandedMobileCard] = useState<string | null>(null);

  useEffect(() => {
    if (providedOfferings) {
      setOfferings(providedOfferings);
      return;
    }

    async function loadOfferings() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/licensing/product-offerings?withFeatures=true&currency=${currency}`);
        const result = await response.json();

        if (result.success) {
          setOfferings(result.data.filter((o: ProductOfferingWithFeatures) => o.is_active));
        }
      } catch (error) {
        console.error('Error loading offerings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadOfferings();
  }, [providedOfferings, currency]);

  // Filter offerings: exclude trial, match billing cycle for paid
  const filteredOfferings = offerings.filter(o => {
    if (o.offering_type === 'trial') return false;
    if (o.offering_type === 'free' || (o.metadata as any)?.pricing?.is_free) return true;
    return o.billing_cycle === billingCycle;
  });

  // Sort by tier order
  const tierOrder = ['essential', 'premium', 'professional', 'enterprise'];
  const sortedOfferings = [...filteredOfferings].sort((a, b) => {
    return tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
  });

  // Get feature value from offering
  const getFeatureValue = (offering: ProductOfferingWithFeatures, featureKey: string): boolean => {
    const metadata = offering.metadata as any;
    const tier = offering.tier;

    const featuresByTier: Record<string, string[]> = {
      essential: [],
      premium: ['import_export', 'pdf_downloads', 'specialized_reports'],
      professional: ['online_donations', 'event_payments', 'import_export', 'pdf_downloads', 'specialized_reports', 'facebook_integration', 'ai_chat', 'ai_compose'],
      enterprise: ['online_donations', 'event_payments', 'import_export', 'pdf_downloads', 'specialized_reports', 'facebook_integration', 'ai_chat', 'ai_compose', 'multi_campus', 'api_access', 'priority_support'],
    };

    const tierAllowsFeature = featuresByTier[tier]?.includes(featureKey) || false;
    if (!tierAllowsFeature) return false;

    if (metadata?.premium_features?.[featureKey] !== undefined) {
      return metadata.premium_features[featureKey];
    }

    if (offering.features && offering.features.length > 0) {
      const featureCodes = FEATURE_CODE_MAPPINGS[featureKey] || [featureKey];
      const hasFeature = offering.features.some(f =>
        featureCodes.some(code =>
          f.code?.toLowerCase() === code.toLowerCase() ||
          f.name?.toLowerCase() === code.toLowerCase().replace(/_/g, ' ')
        )
      );
      if (hasFeature) return true;
    }

    return true;
  };

  // Get quota value from offering
  const getQuotaValue = (offering: ProductOfferingWithFeatures, quotaKey: string): number | null | undefined => {
    return (offering as any)[quotaKey];
  };

  // Format quota value for display
  const formatQuotaValue = (value: number | null | undefined, key: string): { display: string; isUnlimited: boolean } => {
    if (value === null || value === undefined) {
      return { display: 'Unlimited', isUnlimited: true };
    }
    if (value === 0) {
      return { display: '—', isUnlimited: false };
    }

    if (key === 'max_storage_mb') {
      if (value >= 1024) return { display: `${(value / 1024).toFixed(0)} GB`, isUnlimited: false };
      return { display: `${value} MB`, isUnlimited: false };
    }

    if (key.includes('per_month')) {
      return { display: `${value.toLocaleString()}/mo`, isUnlimited: false };
    }

    return { display: value.toLocaleString(), isUnlimited: false };
  };

  // Get price for display
  const getPrice = (offering: ProductOfferingWithFeatures): string => {
    const anyOffering = offering as any;
    const price = anyOffering.resolved_price ?? anyOffering.prices?.[0]?.price;
    if (!price || price === 0) return 'Free';
    return formatCurrency(price, (anyOffering.resolved_currency || currency) as SupportedCurrency);
  };

  const isDark = variant === 'dark';

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 blur-xl opacity-30 animate-pulse" />
          <Loader2 className={`h-10 w-10 animate-spin relative ${isDark ? 'text-emerald-400' : 'text-white'}`} />
        </div>
      </div>
    );
  }

  if (sortedOfferings.length === 0) {
    return null;
  }

  // Check if any offering is featured (for top padding)
  const hasFeaturedOffering = sortedOfferings.some(o => o.is_featured);

  // Mobile Card Component
  const MobilePlanCard = ({ offering, index }: { offering: ProductOfferingWithFeatures; index: number }) => {
    const tierConfig = TIER_CONFIG[offering.tier] || TIER_CONFIG.essential;
    const isExpanded = expandedMobileCard === offering.id;

    return (
      <div className={`relative ${offering.is_featured ? 'pt-5' : ''}`}>
        {/* Floating "Most Popular" badge - positioned outside the card */}
        {offering.is_featured && (
          <motion.div
            initial={{ scale: 0, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", delay: 0.3, stiffness: 200 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-20"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-500/30 rounded-full blur-md transform translate-y-1" />
              <div className="relative flex items-center gap-1.5 bg-gradient-to-r from-yellow-400 to-amber-400 text-gray-900 text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                <Sparkles className="w-3.5 h-3.5" />
                Most Popular
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className={`relative rounded-2xl overflow-hidden ${
            isDark
              ? 'bg-gray-900/80 backdrop-blur-xl border border-gray-700/50'
              : 'bg-white/10 backdrop-blur-xl border border-white/20'
          } ${offering.is_featured ? 'ring-2 ring-emerald-500' : ''}`}
        >

        {/* Card Header */}
        <div className={`p-5 ${offering.is_featured ? (isDark ? 'bg-emerald-500/10' : 'bg-white/10') : ''}`}>
          <div className="flex items-center gap-4">
            {/* Tier icon */}
            <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${tierConfig.gradient} shadow-lg`}>
              <div className="text-white">{tierConfig.icon}</div>
            </div>

            <div className="flex-1">
              <h4 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-white'}`}>
                {offering.name}
              </h4>
              {showPricing && (
                <div className={`${isDark ? 'text-gray-300' : 'text-white/80'}`}>
                  <span className="text-xl font-bold">{getPrice(offering)}</span>
                  {offering.billing_cycle && getPrice(offering) !== 'Free' && (
                    <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-white/50'}`}>
                      /{offering.billing_cycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className={`px-5 py-3 grid grid-cols-3 gap-3 border-t ${isDark ? 'border-gray-700/50 bg-gray-800/30' : 'border-white/10 bg-white/5'}`}>
          {QUOTA_ROWS.slice(0, 3).map((row) => {
            const { display, isUnlimited } = formatQuotaValue(getQuotaValue(offering, row.key), row.key);
            return (
              <div key={row.key} className="text-center">
                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-white/50'}`}>{row.label}</div>
                <div className={`text-sm font-semibold ${isUnlimited ? 'text-emerald-400' : (isDark ? 'text-white' : 'text-white')}`}>
                  {display}
                </div>
              </div>
            );
          })}
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setExpandedMobileCard(isExpanded ? null : offering.id)}
          className={`w-full px-5 py-3 flex items-center justify-center gap-2 border-t transition-colors ${
            isDark
              ? 'border-gray-700/50 hover:bg-gray-800/50 text-gray-400'
              : 'border-white/10 hover:bg-white/5 text-white/60'
          }`}
        >
          <span className="text-sm font-medium">
            {isExpanded ? 'Show less' : 'View all features'}
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {/* Usage Limits */}
              {showCategories.includes('quotas') && (
                <div className={`border-t ${isDark ? 'border-gray-700/50' : 'border-white/10'}`}>
                  <div className={`px-5 py-2 flex items-center gap-2 ${isDark ? 'bg-gray-800/50' : 'bg-white/5'}`}>
                    <TrendingUp className={`w-3.5 h-3.5 ${isDark ? 'text-blue-400' : 'text-white'}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-blue-400' : 'text-white/80'}`}>
                      Usage Limits
                    </span>
                  </div>
                  <div className="px-5 py-3 space-y-2">
                    {QUOTA_ROWS.map((row) => {
                      const { display, isUnlimited } = formatQuotaValue(getQuotaValue(offering, row.key), row.key);
                      const isZero = display === '—';
                      return (
                        <div key={row.key} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded ${isDark ? 'bg-gray-700/50 text-gray-400' : 'bg-white/10 text-white/60'}`}>
                              {row.icon}
                            </div>
                            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-white/80'}`}>{row.label}</span>
                          </div>
                          {isUnlimited ? (
                            <span className="text-xs font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/20">
                              Unlimited
                            </span>
                          ) : isZero ? (
                            <X className="w-4 h-4 text-red-400" />
                          ) : (
                            <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-white'}`}>{display}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Premium Features */}
              {showCategories.includes('features') && (
                <div className={`border-t ${isDark ? 'border-gray-700/50' : 'border-white/10'}`}>
                  <div className={`px-5 py-2 flex items-center gap-2 ${isDark ? 'bg-gray-800/50' : 'bg-white/5'}`}>
                    <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-white'}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-purple-400' : 'text-white/80'}`}>
                      Premium Features
                    </span>
                  </div>
                  <div className="px-5 py-3 space-y-2">
                    {FEATURE_ROWS.map((row) => {
                      const hasFeature = getFeatureValue(offering, row.key);
                      return (
                        <div key={row.key} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded ${isDark ? 'bg-gray-700/50 text-gray-400' : 'bg-white/10 text-white/60'}`}>
                              {row.icon}
                            </div>
                            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-white/80'}`}>{row.label}</span>
                          </div>
                          {hasFeature ? (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500">
                              <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                            </div>
                          ) : (
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-700/50' : 'bg-white/10'}`}>
                              <X className={`w-3.5 h-3.5 ${isDark ? 'text-gray-600' : 'text-white/30'}`} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </motion.div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`relative ${hasFeaturedOffering ? 'lg:pt-5' : ''}`}
    >
      {/* Background glow effects */}
      <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 rounded-3xl blur-2xl" />

      {/* Mobile View - Card Layout */}
      <div className="lg:hidden space-y-4 relative">
        {sortedOfferings.map((offering, index) => (
          <MobilePlanCard key={offering.id} offering={offering} index={index} />
        ))}

        {/* Mobile Footer */}
        <div className={`relative rounded-2xl p-4 ${
          isDark
            ? 'bg-gray-900/80 backdrop-blur-xl border border-gray-700/50'
            : 'bg-white/10 backdrop-blur-xl border border-white/20'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-emerald-500/20' : 'bg-white/20'}`}>
              <Shield className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-white'}`} />
            </div>
            <div>
              <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-white'}`}>30-Day Money Back Guarantee</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-white/60'}`}>Try any plan risk-free</p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop View - Grid Layout */}
      <div className="hidden lg:block relative">
        {/* Floating "Most Popular" badge - positioned outside the container */}
        {sortedOfferings.map((offering, index) => {
          if (!offering.is_featured) return null;

          // Calculate position based on grid columns with proper fr unit math
          const labelFr = 1.5;
          const planFr = 1;
          const totalFr = labelFr + (sortedOfferings.length * planFr);
          const columnStartFr = labelFr + (index * planFr);
          const columnCenterFr = columnStartFr + (planFr / 2);
          const leftPercent = (columnCenterFr / totalFr) * 100;

          return (
            <motion.div
              key={`badge-${offering.id}`}
              initial={{ scale: 0, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", delay: 0.4, stiffness: 200 }}
              className="absolute top-0 z-40 -translate-x-1/2"
              style={{ left: `${leftPercent}%` }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-500/30 rounded-full blur-md transform translate-y-1" />
                <div className="relative flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-400 text-gray-900 text-sm font-bold px-5 py-2 rounded-full shadow-lg whitespace-nowrap">
                  <Sparkles className="w-4 h-4" />
                  Most Popular
                </div>
              </div>
            </motion.div>
          );
        })}

        <div className={`relative rounded-2xl overflow-hidden ${
          isDark
            ? 'bg-gray-900/80 backdrop-blur-xl border border-gray-700/50'
            : 'bg-white/10 backdrop-blur-xl border border-white/20'
        } shadow-2xl`}>

          {/* Gradient top border */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />

          {/* Header Row */}
          <div
            className={`grid sticky top-0 z-20 ${isDark ? 'bg-gray-900/95' : 'bg-black/30'} backdrop-blur-md`}
            style={{ gridTemplateColumns: `minmax(220px, 1.5fr) repeat(${sortedOfferings.length}, minmax(140px, 1fr))` }}
          >
            {/* Corner cell */}
            <div className={`p-5 flex items-center gap-3 border-b ${isDark ? 'border-gray-700/50' : 'border-white/10'}`}>
              <div className={`p-2 rounded-xl ${isDark ? 'bg-emerald-500/10' : 'bg-white/10'}`}>
                <TrendingUp className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-white'}`} />
              </div>
              <div>
                <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-white'}`}>Compare Plans</h3>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-white/60'}`}>Find your perfect fit</p>
              </div>
            </div>

            {/* Plan headers */}
            {sortedOfferings.map((offering, index) => {
              const tierConfig = TIER_CONFIG[offering.tier] || TIER_CONFIG.essential;

              return (
                <motion.div
                  key={offering.id}
                  initial={{ opacity: 0, y: -20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`relative p-5 text-center border-b border-l ${
                    isDark ? 'border-gray-700/50' : 'border-white/10'
                  } ${offering.is_featured ? (isDark ? 'bg-emerald-500/10' : 'bg-white/10') : ''}`}
                >
                  {/* Tier icon */}
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 bg-gradient-to-br ${tierConfig.gradient} shadow-lg`}>
                    <div className="text-white">{tierConfig.icon}</div>
                  </div>

                  {/* Plan name */}
                  <h4 className={`font-bold text-lg mb-1 ${
                    offering.is_featured
                      ? (isDark ? 'text-emerald-400' : 'text-white')
                      : (isDark ? 'text-white' : 'text-white')
                  }`}>
                    {offering.name}
                  </h4>

                  {/* Price */}
                  {showPricing && (
                    <div className={`${isDark ? 'text-gray-300' : 'text-white/80'}`}>
                      <span className="text-2xl font-bold">{getPrice(offering)}</span>
                      {offering.billing_cycle && getPrice(offering) !== 'Free' && (
                        <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-white/50'}`}>
                          /{offering.billing_cycle === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Featured glow */}
                  {offering.is_featured && (
                    <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/20 to-transparent pointer-events-none" />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Quota Rows */}
          {showCategories.includes('quotas') && (
            <>
              {/* Category header */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className={`px-5 py-3 flex items-center gap-2 ${
                  isDark ? 'bg-gray-800/50' : 'bg-white/5'
                } border-b ${isDark ? 'border-gray-700/50' : 'border-white/10'}`}
              >
                <div className={`p-1.5 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-white/10'}`}>
                  <TrendingUp className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-white'}`} />
                </div>
                <span className={`text-sm font-semibold uppercase tracking-wider ${
                  isDark ? 'text-blue-400' : 'text-white/80'
                }`}>
                  Usage Limits
                </span>
              </motion.div>

              {QUOTA_ROWS.map((row, rowIndex) => (
                <motion.div
                  key={row.key}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: rowIndex * 0.05 }}
                  onMouseEnter={() => setHoveredRow(row.key)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={`grid transition-all duration-300 ${
                    hoveredRow === row.key
                      ? (isDark ? 'bg-gray-800/70' : 'bg-white/10')
                      : (rowIndex % 2 === 0 ? (isDark ? 'bg-gray-800/30' : 'bg-white/5') : '')
                  } border-b ${isDark ? 'border-gray-700/30' : 'border-white/10'} last:border-b-0`}
                  style={{ gridTemplateColumns: `minmax(220px, 1.5fr) repeat(${sortedOfferings.length}, minmax(140px, 1fr))` }}
                >
                  {/* Row label */}
                  <div className={`p-4 flex items-center gap-3`}>
                    <div className={`p-2 rounded-lg transition-all duration-300 ${
                      hoveredRow === row.key
                        ? (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/20 text-white')
                        : (isDark ? 'bg-gray-700/50 text-gray-400' : 'bg-white/10 text-white/60')
                    }`}>
                      {row.icon}
                    </div>
                    <div>
                      <div className={`font-medium ${isDark ? 'text-white' : 'text-white'}`}>{row.label}</div>
                      {row.description && (
                        <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-white/50'}`}>{row.description}</div>
                      )}
                    </div>
                  </div>

                  {/* Values */}
                  {sortedOfferings.map((offering) => {
                    const { display, isUnlimited } = formatQuotaValue(getQuotaValue(offering, row.key), row.key);
                    const isZero = display === '—';

                    return (
                      <div
                        key={`${row.key}-${offering.id}`}
                        className={`p-4 flex items-center justify-center border-l ${
                          isDark ? 'border-gray-700/30' : 'border-white/10'
                        } ${offering.is_featured ? (isDark ? 'bg-emerald-500/5' : 'bg-white/5') : ''}`}
                      >
                        {isUnlimited ? (
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-sm font-bold text-emerald-400">Unlimited</span>
                          </motion.div>
                        ) : isZero ? (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isDark ? 'bg-red-500/10' : 'bg-red-500/20'
                          }`}>
                            <X className="w-4 h-4 text-red-400" />
                          </div>
                        ) : (
                          <span className={`text-lg font-semibold ${
                            isDark ? 'text-white' : 'text-white'
                          } ${offering.is_featured ? 'text-emerald-300' : ''}`}>
                            {display}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              ))}
            </>
          )}

          {/* Feature Rows */}
          {showCategories.includes('features') && (
            <>
              {/* Category header */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className={`px-5 py-3 flex items-center gap-2 ${
                  isDark ? 'bg-gray-800/50' : 'bg-white/5'
                } border-b ${isDark ? 'border-gray-700/50' : 'border-white/10'}`}
              >
                <div className={`p-1.5 rounded-lg ${isDark ? 'bg-purple-500/20' : 'bg-white/10'}`}>
                  <Sparkles className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-white'}`} />
                </div>
                <span className={`text-sm font-semibold uppercase tracking-wider ${
                  isDark ? 'text-purple-400' : 'text-white/80'
                }`}>
                  Premium Features
                </span>
              </motion.div>

              {FEATURE_ROWS.map((row, rowIndex) => {
                const baseIndex = QUOTA_ROWS.length;
                return (
                  <motion.div
                    key={row.key}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: (baseIndex + rowIndex) * 0.03 }}
                    onMouseEnter={() => setHoveredRow(row.key)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className={`grid transition-all duration-300 ${
                      hoveredRow === row.key
                        ? (isDark ? 'bg-gray-800/70' : 'bg-white/10')
                        : (rowIndex % 2 === 0 ? (isDark ? 'bg-gray-800/30' : 'bg-white/5') : '')
                    } border-b ${isDark ? 'border-gray-700/30' : 'border-white/10'} last:border-b-0`}
                    style={{ gridTemplateColumns: `minmax(220px, 1.5fr) repeat(${sortedOfferings.length}, minmax(140px, 1fr))` }}
                  >
                    {/* Row label */}
                    <div className={`p-4 flex items-center gap-3`}>
                      <div className={`p-2 rounded-lg transition-all duration-300 ${
                        hoveredRow === row.key
                          ? (isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-white/20 text-white')
                          : (isDark ? 'bg-gray-700/50 text-gray-400' : 'bg-white/10 text-white/60')
                      }`}>
                        {row.icon}
                      </div>
                      <div>
                        <div className={`font-medium ${isDark ? 'text-white' : 'text-white'}`}>{row.label}</div>
                        {row.description && (
                          <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-white/50'}`}>{row.description}</div>
                        )}
                      </div>
                    </div>

                    {/* Values */}
                    {sortedOfferings.map((offering) => {
                      const hasFeature = getFeatureValue(offering, row.key);

                      return (
                        <div
                          key={`${row.key}-${offering.id}`}
                          className={`p-4 flex items-center justify-center border-l ${
                            isDark ? 'border-gray-700/30' : 'border-white/10'
                          } ${offering.is_featured ? (isDark ? 'bg-emerald-500/5' : 'bg-white/5') : ''}`}
                        >
                          {hasFeature ? (
                            <motion.div
                              whileHover={{ scale: 1.2, rotate: 5 }}
                              className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg ${
                                offering.is_featured
                                  ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                                  : (isDark ? 'bg-gradient-to-br from-emerald-500/80 to-teal-600/80' : 'bg-gradient-to-br from-emerald-400 to-teal-500')
                              }`}
                            >
                              <Check className="w-5 h-5 text-white" strokeWidth={3} />
                            </motion.div>
                          ) : (
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                              isDark ? 'bg-gray-700/50' : 'bg-white/10'
                            }`}>
                              <X className={`w-4 h-4 ${isDark ? 'text-gray-600' : 'text-white/30'}`} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                );
              })}
            </>
          )}

          {/* Bottom CTA bar */}
          <div className={`p-5 flex items-center justify-between ${
            isDark ? 'bg-gradient-to-r from-gray-800/80 to-gray-900/80' : 'bg-gradient-to-r from-white/5 to-white/10'
          } border-t ${isDark ? 'border-gray-700/50' : 'border-white/10'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-emerald-500/20' : 'bg-white/20'}`}>
                <Shield className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-white'}`} />
              </div>
              <div>
                <p className={`font-medium ${isDark ? 'text-white' : 'text-white'}`}>30-Day Money Back Guarantee</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-white/60'}`}>Try any plan risk-free</p>
              </div>
            </div>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-white/60'}`}>
              Need help choosing? <a href="/contact" className={`font-medium ${isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-white hover:text-white/80'} transition-colors`}>Contact us</a>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default PlanComparisonMatrix;
