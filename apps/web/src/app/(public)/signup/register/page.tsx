'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Loader2, CheckCircle2, AlertCircle, Shield, Clock, Sparkles, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Turnstile } from '@marsidev/react-turnstile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { svgPaths } from '@/components/landing/svg-paths';

// Common church denominations
const DENOMINATION_OPTIONS = [
  { value: 'UCCP', label: 'United Church of Christ in the Philippines (UCCP)' },
  { value: 'Catholic', label: 'Roman Catholic' },
  { value: 'Baptist', label: 'Baptist' },
  { value: 'Methodist', label: 'Methodist' },
  { value: 'Presbyterian', label: 'Presbyterian' },
  { value: 'Pentecostal', label: 'Pentecostal' },
  { value: 'Evangelical', label: 'Evangelical' },
  { value: 'Lutheran', label: 'Lutheran' },
  { value: 'Anglican', label: 'Anglican / Episcopal' },
  { value: 'Seventh-day Adventist', label: 'Seventh-day Adventist' },
  { value: 'Church of Christ', label: 'Church of Christ' },
  { value: 'Assemblies of God', label: 'Assemblies of God' },
  { value: 'Iglesia ni Cristo', label: 'Iglesia ni Cristo' },
  { value: 'Born Again', label: 'Born Again Christian' },
  { value: 'Non-denominational', label: 'Non-denominational' },
  { value: 'Interdenominational', label: 'Interdenominational' },
  { value: 'Other', label: 'Other' },
];
import type { ProductOffering, ProductOfferingPrice } from '@/models/productOffering.model';
import { formatCurrency, SupportedCurrency, PRIMARY_CURRENCY } from '@/lib/currency';

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

function BackgroundVectors() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 scale-[0.5] md:scale-[0.7] lg:scale-90 w-[3100px] h-[2300px] opacity-10">
        {/* Angular geometric pattern - left side */}
        <div className="absolute top-0 left-0 w-[3051.88px] h-[2220.55px] mix-blend-soft-light">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 3052 2221">
            <g style={{ mixBlendMode: "soft-light" }}>
              <path d={svgPaths.p27146000} fill="url(#paint0_linear_register_1)" />
            </g>
            <defs>
              <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_register_1" x1="0" x2="3051.88" y1="1110.28" y2="1110.28">
                <stop stopColor="white" />
                <stop offset="0.677885" stopColor="#999999" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        {/* Flowing geometric pattern - right side */}
        <div className="absolute top-[100px] right-[-400px] w-[2911.92px] h-[2220.55px] mix-blend-soft-light rotate-[10deg]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2912 2221">
            <g style={{ mixBlendMode: "soft-light" }}>
              <path d={svgPaths.p2a2c6300} fill="url(#paint0_linear_register_2)" fillOpacity="0.6" />
            </g>
            <defs>
              <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_register_2" x1="0" x2="2911.92" y1="1110.28" y2="1110.28">
                <stop stopColor="white" />
                <stop offset="0.953184" stopColor="#999999" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
}

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const offeringId = searchParams.get('offering');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    churchName: '',
    denomination: '',
    firstName: '',
    lastName: '',
  });

  const [selectedOffering, setSelectedOffering] = useState<ProductOffering | null>(null);
  const [isLoadingOffering, setIsLoadingOffering] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [offeringDiscount, setOfferingDiscount] = useState<OfferingDiscount | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      // Check if user is already authenticated
      try {
        const authResponse = await fetch('/api/auth/status');
        const authData = await authResponse.json();
        if (authData.authenticated) {
          router.replace('/admin');
          return;
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }

      // Load offering if not authenticated
      if (offeringId) {
        loadOffering(offeringId);
      } else {
        setIsLoadingOffering(false);
        toast.error('No plan selected. Redirecting to signup...');
        setTimeout(() => router.push('/signup'), 2000);
      }
    };

    init();
  }, [offeringId, router]);

  async function loadOffering(id: string) {
    try {
      const response = await fetch(`/api/licensing/product-offerings/${id}`);
      const result = await response.json();

      if (result.success && result.data) {
        setSelectedOffering(result.data);
        // Load discount for this offering
        await loadDiscount(result.data);
      } else {
        toast.error('Failed to load selected plan');
        router.push('/signup');
      }
    } catch (error) {
      console.error('Error loading offering:', error);
      toast.error('Failed to load selected plan');
      router.push('/signup');
    } finally {
      setIsLoadingOffering(false);
    }
  }

  async function loadDiscount(offering: ProductOffering) {
    try {
      const priceInfo = getOfferingPrice(offering);
      console.log('[Register] Loading discount for offering:', offering.id, 'price:', priceInfo);
      if (!priceInfo || priceInfo.price === 0) return;

      const response = await fetch('/api/licensing/discounts/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offeringId: offering.id,
          amount: priceInfo.price,
          currency: priceInfo.currency,
        }),
      });
      const result = await response.json();
      console.log('[Register] Discount response:', result);

      if (result.success && result.data?.discount) {
        setOfferingDiscount({
          offeringId: offering.id,
          discount: result.data.discount,
          originalPrice: result.data.originalPrice ?? priceInfo.price,
          discountedPrice: result.data.discountedPrice ?? priceInfo.price,
          discountAmount: result.data.discountAmount ?? 0,
        });
      }
    } catch (error) {
      console.error('Error loading discount:', error);
    }
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Church name validation
    if (!formData.churchName || formData.churchName.trim().length === 0) {
      newErrors.churchName = 'Church name is required';
    }

    // First name validation
    if (!formData.firstName || formData.firstName.trim().length === 0) {
      newErrors.firstName = 'First name is required';
    }

    // Last name validation
    if (!formData.lastName || formData.lastName.trim().length === 0) {
      newErrors.lastName = 'Last name is required';
    }

    // Turnstile validation
    if (!turnstileToken) {
      newErrors.turnstile = 'Please complete the security check';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log('[Register] Form submitted, selectedOffering:', selectedOffering?.id, 'billing_cycle:', selectedOffering?.billing_cycle);

    if (!validateForm()) {
      console.log('[Register] Form validation failed');
      toast.error('Please correct the errors in the form');
      return;
    }

    if (!offeringId) {
      console.log('[Register] No offering ID');
      toast.error('No plan selected');
      return;
    }

    console.log('[Register] Starting registration process');
    setIsRegistering(true);

    try {
      // Check if this is a free/trial offering (no payment required)
      const isTrial = selectedOffering?.offering_type === 'trial';
      const isFree = selectedOffering?.offering_type === 'free' ||
        (selectedOffering?.metadata as any)?.pricing?.is_free;

      // Also check if price is 0
      const priceInfo = selectedOffering ? getOfferingPrice(selectedOffering) : null;
      const priceIsZero = !priceInfo || priceInfo.price === 0;

      // Prepare registration data for the processing page
      const registrationData = {
        ...formData,
        offeringId,
        isTrial,
        isFree,
        priceIsZero,
        turnstileToken,
      };

      // Encode registration data as base64 for URL-safe transmission
      // Use TextEncoder for proper UTF-8 support (handles special characters like accents)
      const jsonString = JSON.stringify(registrationData);
      console.log('[Register] Registration data prepared, size:', jsonString.length);

      const encoder = new TextEncoder();
      const bytes = encoder.encode(jsonString);
      const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
      const encodedData = btoa(binaryString);

      console.log('[Register] Redirecting to processing page, encoded size:', encodedData.length);
      // Redirect to processing page which will handle the registration
      window.location.href = `/signup/register/processing?data=${encodedData}`;
    } catch (error) {
      console.error('[Register] Registration error:', error);
      toast.error(`Failed to process registration: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsRegistering(false);
    }
  }

  function handleInputChange(field: string, value: string) {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  }

  /**
   * Get the price for an offering from the prices array.
   * Falls back to PRIMARY_CURRENCY if no price found.
   */
  function getOfferingPrice(offering: ProductOffering): { price: number; currency: string } | null {
    const anyOffering = offering as any;

    // First try resolved_price from API
    if (anyOffering.resolved_price !== undefined && anyOffering.resolved_price !== null) {
      return {
        price: anyOffering.resolved_price,
        currency: anyOffering.resolved_currency || PRIMARY_CURRENCY,
      };
    }

    // Fall back to prices array
    const prices: ProductOfferingPrice[] = anyOffering.prices || [];
    if (prices.length > 0) {
      // Try to find price in primary currency first
      const primaryPrice = prices.find(p => p.currency === PRIMARY_CURRENCY && p.is_active);
      if (primaryPrice) {
        return { price: primaryPrice.price, currency: primaryPrice.currency };
      }
      // Fall back to first active price
      const firstActivePrice = prices.find(p => p.is_active);
      if (firstActivePrice) {
        return { price: firstActivePrice.price, currency: firstActivePrice.currency };
      }
    }

    return null;
  }

  function formatPrice(offering: ProductOffering): string {
    const priceInfo = getOfferingPrice(offering);

    if (!priceInfo || priceInfo.price === 0) {
      return 'Free';
    }

    return formatCurrency(priceInfo.price, priceInfo.currency as SupportedCurrency);
  }

  function hasPrice(offering: ProductOffering): boolean {
    const priceInfo = getOfferingPrice(offering);
    return priceInfo !== null && priceInfo.price > 0;
  }

  function getBillingPeriod(offering: ProductOffering): string {
    if (!offering.billing_cycle) return '';

    const periods: Record<string, string> = {
      monthly: '/month',
      annual: '/year',
      lifetime: 'one-time',
    };

    return periods[offering.billing_cycle] || '';
  }

  function formatPriceValue(price: number, currency: string): string {
    return formatCurrency(price, currency as SupportedCurrency);
  }

  if (isLoadingOffering) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#179a65]" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-200px)]">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#179a65] via-green-600 to-[#0F766E]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.08),transparent_40%)]" />
      <BackgroundVectors />

      <div className="relative z-10 flex items-center justify-center px-4 pt-36 pb-16 md:pt-44 md:pb-24">
        <div className="w-full max-w-6xl grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">
          {/* Left Column - Plan Summary & Benefits */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="hidden lg:flex lg:col-span-2 flex-col text-white"
          >
            {/* Back link */}
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-8 text-sm"
            >
              <ArrowLeft className="size-4" />
              Back to Plans
            </Link>

            {/* Selected Plan Card */}
            {selectedOffering && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-8"
              >
                <div className="flex items-center gap-2 mb-4">
                  {selectedOffering.is_featured && (
                    <span className="inline-flex items-center gap-1 bg-white text-[#179a65] text-xs font-bold px-3 py-1 rounded-full">
                      <Sparkles className="h-3 w-3" />
                      Most Popular
                    </span>
                  )}
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">
                  {selectedOffering.name}
                  {selectedOffering.offering_type === 'trial' && (
                    <span className="ml-2 text-xs font-bold px-2 py-1 rounded-full bg-green-500 text-white align-middle">
                      FREE TRIAL
                    </span>
                  )}
                </h3>

                {/* Trial Pricing Display */}
                {selectedOffering.offering_type === 'trial' ? (
                  <div className="mb-4">
                    {/* Trial Badge */}
                    <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-4xl font-bold text-white">Free</span>
                        <span className="text-lg text-white/70">
                          for {(selectedOffering.metadata as any)?.trial_days || 14} days
                        </span>
                      </div>
                      <p className="text-sm text-green-200">
                        No credit card required to start your trial
                      </p>
                    </div>

                    {/* After Trial Pricing */}
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <p className="text-xs text-white/60 mb-1">After trial ends:</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-white">
                          {formatPriceValue(
                            (selectedOffering.metadata as any)?.converts_to_price || 1090,
                            'PHP'
                          )}
                        </span>
                        <span className="text-sm text-white/70">/month</span>
                      </div>
                      <p className="text-xs text-white/50 mt-1">
                        You&apos;ll be notified before your trial ends. Cancel anytime.
                      </p>
                    </div>
                  </div>
                ) : offeringDiscount ? (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-4xl font-bold text-white">
                        {formatPriceValue(offeringDiscount.discountedPrice, getOfferingPrice(selectedOffering)?.currency || 'PHP')}
                      </span>
                      {hasPrice(selectedOffering) && (
                        <span className="text-lg text-white/70">
                          {getBillingPeriod(selectedOffering)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/50 line-through">
                        {formatPrice(selectedOffering)}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-400 text-gray-900">
                        {offeringDiscount.discount?.badge_text ||
                          (offeringDiscount.discount?.calculation_type === 'percentage'
                            ? `${offeringDiscount.discount?.discount_value || 0}% OFF`
                            : `Save ${formatPriceValue(offeringDiscount.discountAmount || 0, getOfferingPrice(selectedOffering)?.currency || 'PHP')}`
                          )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-bold text-white">
                      {formatPrice(selectedOffering)}
                    </span>
                    {hasPrice(selectedOffering) && (
                      <span className="text-lg text-white/70">
                        {getBillingPeriod(selectedOffering)}
                      </span>
                    )}
                  </div>
                )}

                <p className="text-white/80 text-sm mb-6">
                  {selectedOffering.description}
                </p>

                <div className="space-y-3 border-t border-white/20 pt-4">
                  <h4 className="text-sm font-semibold text-white/90">Includes:</h4>
                  <ul className="space-y-2 text-sm text-white/80">
                    {selectedOffering.max_users ? (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-green-200" />
                        Up to {selectedOffering.max_users} users
                      </li>
                    ) : (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-green-200" />
                        Unlimited users
                      </li>
                    )}
                    {selectedOffering.offering_type === 'trial' && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-green-200" />
                        {(selectedOffering.metadata as any)?.trial_days || 14}-day trial period
                      </li>
                    )}
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-green-200" />
                      Full access to features
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-green-200" />
                      Email support
                    </li>
                  </ul>
                </div>

                <div className="mt-6">
                  <Link
                    href="/signup"
                    className="text-sm text-white/80 hover:text-white underline transition-colors"
                  >
                    Change Plan
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                <div className="rounded-lg bg-white/20 p-3">
                  <Shield className="size-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm">Secure & Private</h4>
                  <p className="text-xs text-white/70">256-bit encryption for your data</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                <div className="rounded-lg bg-white/20 p-3">
                  <Clock className="size-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm">30-Day Money Back</h4>
                  <p className="text-xs text-white/70">No questions asked refund policy</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Registration Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="w-full lg:col-span-3"
          >
            <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10">
              {/* Mobile back link */}
              <Link
                href="/signup"
                className="lg:hidden inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-6 text-sm"
              >
                <ArrowLeft className="size-4" />
                Back to Plans
              </Link>

              <div className="mb-8 space-y-2">
                <h1 className="text-2xl font-bold text-gray-900">Create Your Account</h1>
                <p className="text-gray-500">
                  Get started with StewardTrack in just a few steps
                </p>
              </div>

              {/* Mobile Plan Summary */}
              {selectedOffering && (
                <div className="lg:hidden mb-6 p-4 rounded-xl bg-[#179a65]/5 border border-[#179a65]/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-500">Selected Plan</span>
                      <h3 className="font-semibold text-gray-900">{selectedOffering.name}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-[#179a65]">
                        {formatPrice(selectedOffering)}
                      </span>
                      {hasPrice(selectedOffering) && (
                        <span className="text-sm text-gray-500">
                          {getBillingPeriod(selectedOffering)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Church Name */}
                <div className="space-y-2">
                  <label htmlFor="churchName" className="block text-sm font-medium text-foreground">
                    Church Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="churchName"
                    type="text"
                    placeholder="First Community Church"
                    value={formData.churchName}
                    onChange={(e) => handleInputChange('churchName', e.target.value)}
                    disabled={isRegistering}
                    className={`h-11 ${errors.churchName ? 'border-destructive' : ''}`}
                  />
                  {errors.churchName && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.churchName}
                    </p>
                  )}
                </div>

                {/* Denomination */}
                <div className="space-y-2">
                  <label htmlFor="denomination" className="block text-sm font-medium text-foreground">
                    Denomination
                  </label>
                  <Select
                    value={formData.denomination}
                    onValueChange={(value) => handleInputChange('denomination', value)}
                    disabled={isRegistering}
                  >
                    <SelectTrigger className={`h-11 ${errors.denomination ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Select denomination (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {DENOMINATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.denomination && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.denomination}
                    </p>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* First Name */}
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="block text-sm font-medium text-foreground">
                      First Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      disabled={isRegistering}
                      className={`h-11 ${errors.firstName ? 'border-destructive' : ''}`}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="block text-sm font-medium text-foreground">
                      Last Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      disabled={isRegistering}
                      className={`h-11 ${errors.lastName ? 'border-destructive' : ''}`}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-foreground">
                    Email Address <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={isRegistering}
                    className={`h-11 ${errors.email ? 'border-destructive' : ''}`}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    Password <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    disabled={isRegistering}
                    className={`h-11 ${errors.password ? 'border-destructive' : ''}`}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
                    Confirm Password <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    disabled={isRegistering}
                    className={`h-11 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* Cloudflare Turnstile CAPTCHA */}
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <Turnstile
                      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
                      onSuccess={(token) => {
                        setTurnstileToken(token);
                        if (errors.turnstile) {
                          setErrors({ ...errors, turnstile: '' });
                        }
                      }}
                      onError={() => {
                        setTurnstileToken(null);
                        setErrors({ ...errors, turnstile: 'Security check failed. Please try again.' });
                      }}
                      onExpire={() => {
                        setTurnstileToken(null);
                      }}
                      options={{
                        theme: 'light',
                        size: 'normal',
                      }}
                    />
                  </div>
                  {errors.turnstile && (
                    <p className="text-sm text-destructive flex items-center justify-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.turnstile}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isRegistering}
                  >
                    {isRegistering ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirecting...
                      </>
                    ) : (
                      'Create your account'
                    )}
                  </Button>
                </div>

                <p className="text-xs text-center text-gray-400 pt-2">
                  By creating an account, you agree to our{' '}
                  <a href="/terms" className="underline hover:text-gray-600 transition-colors">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="underline hover:text-gray-600 transition-colors">
                    Privacy Policy
                  </a>
                </p>
              </form>

              {/* Already have an account */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="text-center text-sm">
                  <span className="text-gray-400">Already have an account?</span>
                  <span className="mx-2 text-gray-300">&bull;</span>
                  <Link
                    href="/login"
                    className="font-semibold text-[#179a65] hover:text-green-700 transition-colors"
                  >
                    Sign in instead
                  </Link>
                </div>
              </div>

              {/* Trust Badges - Desktop */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="rounded-full bg-[#179a65]/10 p-1.5">
                      <Shield className="size-3 text-[#179a65]" />
                    </div>
                    <span>Bank-level Security</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="rounded-full bg-[#179a65]/10 p-1.5">
                      <CheckCircle2 className="size-3 text-[#179a65]" />
                    </div>
                    <span>256-bit Encryption</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile-only tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="lg:hidden mt-6 text-center text-white/80 text-sm"
            >
              Trusted by 500+ churches worldwide
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="relative overflow-hidden min-h-[calc(100vh-200px)]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#179a65] via-green-600 to-[#0F766E]" />
        <div className="relative z-10 flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      </div>
    }>
      <RegisterFormContent />
    </Suspense>
  );
}
