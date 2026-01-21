'use client';

import { useState, Suspense, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Mail, RefreshCcw, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Verify Email Pending Page
 *
 * Shown after registration to prompt user to check their email.
 * Includes resend functionality with cooldown timer.
 */

const RESEND_COOLDOWN_SECONDS = 60;

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get('email') || '';
  const churchName = searchParams.get('church') || '';

  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  /**
   * Handle resend verification email
   */
  const handleResend = useCallback(async () => {
    if (resending || cooldownSeconds > 0 || !email) return;

    setResending(true);
    setResendError(null);
    setResendSuccess(false);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.status === 429) {
        // Rate limited
        setResendError(result.error || 'Too many attempts. Please wait before trying again.');
        setCooldownSeconds(RESEND_COOLDOWN_SECONDS * 5); // Longer cooldown on rate limit
      } else if (!result.success) {
        setResendError(result.error || 'Failed to resend verification email.');
      } else {
        setResendSuccess(true);
        setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
        // Clear success message after a few seconds
        setTimeout(() => setResendSuccess(false), 5000);
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      setResendError('An error occurred. Please try again.');
    } finally {
      setResending(false);
    }
  }, [email, resending, cooldownSeconds]);

  /**
   * Handle starting over with different email
   */
  const handleStartOver = () => {
    router.push('/signup');
  };

  // If no email parameter, redirect to signup
  useEffect(() => {
    if (!email) {
      router.push('/signup');
    }
  }, [email, router]);

  if (!email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-[#179a65] mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center justify-center size-20 rounded-full bg-[#179a65]/10 dark:bg-[#179a65]/20 mb-4"
          >
            <Mail className="size-10 text-[#179a65]" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Check Your Email
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            We've sent a verification link to
          </p>
          <p className="text-[#179a65] font-medium mt-1 break-all">
            {email}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 space-y-6">
            {/* Instructions */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#179a65]/10 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-[#179a65]">1</span>
                </div>
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Open the email from <span className="font-medium">StewardTrack</span>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#179a65]/10 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-[#179a65]">2</span>
                </div>
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Click the <span className="font-medium">"Verify Email"</span> button
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#179a65]/10 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-[#179a65]">3</span>
                </div>
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {churchName ? (
                      <>Your church <span className="font-medium">"{churchName}"</span> will be set up automatically</>
                    ) : (
                      'Your church will be set up automatically'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Info box */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <span className="font-medium">Note:</span> The verification link expires in 24 hours.
                Check your spam folder if you don't see the email.
              </p>
            </div>

            {/* Success message */}
            {resendSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    Verification email sent! Please check your inbox.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {/* Error message */}
            {resendError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{resendError}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleResend}
                disabled={resending || cooldownSeconds > 0}
                className="w-full bg-[#179a65] hover:bg-green-600 disabled:opacity-50"
              >
                {resending ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : cooldownSeconds > 0 ? (
                  <>
                    <RefreshCcw className="size-4 mr-2" />
                    Resend in {cooldownSeconds}s
                  </>
                ) : (
                  <>
                    <RefreshCcw className="size-4 mr-2" />
                    Resend Verification Email
                  </>
                )}
              </Button>

              <Button
                onClick={handleStartOver}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="size-4 mr-2" />
                Use Different Email
              </Button>
            </div>
          </div>
        </div>

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

export default function VerifyEmailPage() {
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
      <VerifyEmailContent />
    </Suspense>
  );
}
