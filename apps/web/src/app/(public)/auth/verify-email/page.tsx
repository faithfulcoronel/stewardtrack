'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Mail,
  RefreshCcw,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Email Verification Callback Page
 *
 * Handles verification link clicks from email.
 * Validates token, completes tenant provisioning, and redirects to processing page.
 */

type VerificationStatus = 'verifying' | 'success' | 'error' | 'expired';

interface VerificationResult {
  tenantId?: string;
  subdomain?: string;
  message?: string;
  // Offering type flags for redirect logic
  offeringId?: string;
  isTrial?: boolean;
  isFree?: boolean;
  priceIsZero?: boolean;
  // User data for checkout
  email?: string;
  firstName?: string;
  lastName?: string;
  // Coupon data for checkout
  couponCode?: string | null;
  couponDiscountId?: string | null;
  couponDurationBillingCycles?: number | null;
}

function VerifyEmailCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  /**
   * Verify the email token
   */
  const verifyToken = useCallback(async () => {
    if (!token) {
      setStatus('error');
      setError('No verification token provided.');
      return;
    }

    try {
      setStatus('verifying');
      setError(null);

      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = data.error || 'Verification failed';

        // Check if token is expired
        if (errorMessage.toLowerCase().includes('expired')) {
          setStatus('expired');
        } else {
          setStatus('error');
        }
        setError(errorMessage);
        return;
      }

      // Success
      setStatus('success');
      const resultData: VerificationResult = {
        tenantId: data.data?.tenantId,
        subdomain: data.data?.subdomain,
        message: data.data?.message,
        // Offering type flags
        offeringId: data.data?.offeringId,
        isTrial: data.data?.isTrial,
        isFree: data.data?.isFree,
        priceIsZero: data.data?.priceIsZero,
        // User data
        email: data.data?.email,
        firstName: data.data?.firstName,
        lastName: data.data?.lastName,
        // Coupon data
        couponCode: data.data?.couponCode,
        couponDiscountId: data.data?.couponDiscountId,
        couponDurationBillingCycles: data.data?.couponDurationBillingCycles,
      };
      setResult(resultData);

      // Auto-redirect to processing page after brief success display
      // Include result data in URL for the processing page to show completion
      setTimeout(() => {
        const params = new URLSearchParams({
          verified: 'true',
          ...(resultData.tenantId && { tenantId: resultData.tenantId }),
          ...(resultData.subdomain && { subdomain: resultData.subdomain }),
          // Include offering type flags
          ...(resultData.offeringId && { offeringId: resultData.offeringId }),
          ...(resultData.isTrial !== undefined && { isTrial: String(resultData.isTrial) }),
          ...(resultData.isFree !== undefined && { isFree: String(resultData.isFree) }),
          ...(resultData.priceIsZero !== undefined && { priceIsZero: String(resultData.priceIsZero) }),
          // Include user data for checkout
          ...(resultData.email && { email: resultData.email }),
          ...(resultData.firstName && { firstName: resultData.firstName }),
          ...(resultData.lastName && { lastName: resultData.lastName }),
          // Include coupon data
          ...(resultData.couponCode && { couponCode: resultData.couponCode }),
          ...(resultData.couponDiscountId && { couponDiscountId: resultData.couponDiscountId }),
          ...(resultData.couponDurationBillingCycles && { couponDurationBillingCycles: String(resultData.couponDurationBillingCycles) }),
        });
        router.push(`/signup/register/processing?${params.toString()}`);
      }, 2500);
    } catch (err) {
      console.error('Verification error:', err);
      setStatus('error');
      setError('An unexpected error occurred. Please try again.');
    }
  }, [token, router]);

  /**
   * Handle resend verification email
   */
  const handleResend = async () => {
    if (!email || resending) return;

    setResending(true);
    setResendSuccess(false);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setResendSuccess(true);
      } else {
        setError(data.error || 'Failed to resend verification email.');
      }
    } catch (err) {
      console.error('Resend error:', err);
      setError('Failed to resend verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // Start verification on mount
  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setStatus('error');
      setError('Invalid verification link. Please check your email and try again.');
    }
  }, [token, verifyToken]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Verifying State */}
        {status === 'verifying' && (
          <>
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center justify-center size-20 rounded-full bg-[#179a65]/10 dark:bg-[#179a65]/20 mb-4"
              >
                <Loader2 className="size-10 text-[#179a65] animate-spin" />
              </motion.div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Verifying Your Email
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Please wait while we verify your email address...
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="rounded-full bg-[#179a65]/10 p-4"
                  >
                    <Mail className="size-8 text-[#179a65]" />
                  </motion.div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Setting up your church workspace...
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Success State */}
        {status === 'success' && (
          <>
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="inline-flex items-center justify-center size-20 rounded-full bg-green-100 dark:bg-green-900/20 mb-4"
              >
                <CheckCircle2 className="size-10 text-green-600 dark:text-green-400" />
              </motion.div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Email Verified!
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                {result?.message || 'Your email has been verified successfully.'}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 space-y-6">
                <div className="flex flex-col items-center justify-center py-4 space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your church workspace is being created.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      Redirecting automatically...
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    const params = new URLSearchParams({
                      verified: 'true',
                      ...(result?.tenantId && { tenantId: result.tenantId }),
                      ...(result?.subdomain && { subdomain: result.subdomain }),
                      // Include offering type flags
                      ...(result?.offeringId && { offeringId: result.offeringId }),
                      ...(result?.isTrial !== undefined && { isTrial: String(result.isTrial) }),
                      ...(result?.isFree !== undefined && { isFree: String(result.isFree) }),
                      ...(result?.priceIsZero !== undefined && { priceIsZero: String(result.priceIsZero) }),
                      // Include user data for checkout
                      ...(result?.email && { email: result.email }),
                      ...(result?.firstName && { firstName: result.firstName }),
                      ...(result?.lastName && { lastName: result.lastName }),
                      // Include coupon data
                      ...(result?.couponCode && { couponCode: result.couponCode }),
                      ...(result?.couponDiscountId && { couponDiscountId: result.couponDiscountId }),
                      ...(result?.couponDurationBillingCycles && { couponDurationBillingCycles: String(result.couponDurationBillingCycles) }),
                    });
                    router.push(`/signup/register/processing?${params.toString()}`);
                  }}
                  className="w-full bg-[#179a65] hover:bg-green-600"
                >
                  Continue
                  <ArrowRight className="size-4 ml-2" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Error State */}
        {status === 'error' && (
          <>
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center justify-center size-20 rounded-full bg-red-100 dark:bg-red-900/20 mb-4"
              >
                <XCircle className="size-10 text-red-600 dark:text-red-400" />
              </motion.div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Verification Failed
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                We couldn't verify your email address.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 space-y-6">
                <Alert variant="destructive">
                  <XCircle className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Button
                    onClick={() => router.push('/signup')}
                    className="w-full"
                  >
                    Back to Sign Up
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Expired Token State */}
        {status === 'expired' && (
          <>
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center justify-center size-20 rounded-full bg-amber-100 dark:bg-amber-900/20 mb-4"
              >
                <Mail className="size-10 text-amber-600 dark:text-amber-400" />
              </motion.div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Link Expired
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                This verification link has expired.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 space-y-6">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Verification links expire after 24 hours for security.
                    {email && ' Request a new verification email below.'}
                  </p>
                </div>

                {resendSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                      <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        New verification email sent! Please check your inbox.
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}

                <div className="space-y-3">
                  {email && (
                    <Button
                      onClick={handleResend}
                      disabled={resending || resendSuccess}
                      className="w-full bg-[#179a65] hover:bg-green-600 disabled:opacity-50"
                    >
                      {resending ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : resendSuccess ? (
                        <>
                          <CheckCircle2 className="size-4 mr-2" />
                          Email Sent
                        </>
                      ) : (
                        <>
                          <RefreshCcw className="size-4 mr-2" />
                          Resend Verification Email
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    onClick={() => router.push('/signup')}
                    variant={email ? 'outline' : 'default'}
                    className="w-full"
                  >
                    {email ? 'Back to Sign Up' : 'Start Over'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Help Text */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          Having trouble?{' '}
          <a
            href="mailto:support@stewardtrack.com"
            className="text-[#179a65] hover:underline"
          >
            Contact Support
          </a>
        </p>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
          <div className="text-center">
            <Loader2 className="size-8 animate-spin text-[#179a65] mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <VerifyEmailCallbackContent />
    </Suspense>
  );
}
