'use client';

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Shield, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { ResetPasswordForm } from "./reset-password-form";
import { svgPaths } from '@/components/landing/svg-paths';

function BackgroundVectors() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 scale-[0.5] md:scale-[0.7] lg:scale-90 w-[2100px] h-[2700px] opacity-10">
        {/* Main diagonal lines pattern */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2012.79px] h-[2608.31px] mix-blend-soft-light">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2013 2609">
            <g style={{ mixBlendMode: "soft-light" }}>
              <path d={svgPaths.p3320a480} fill="url(#paint0_linear_reset_1)" />
            </g>
            <defs>
              <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_reset_1" x1="1006.4" x2="1006.4" y1="0" y2="2608.31">
                <stop stopColor="white" />
                <stop offset="0.677885" stopColor="#999999" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        {/* Angled strokes pattern */}
        <div className="absolute top-[200px] left-[-200px] w-[2980.52px] h-[2929.62px] mix-blend-soft-light rotate-[15deg]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2981 2930">
            <g style={{ mixBlendMode: "soft-light" }}>
              <path d={svgPaths.p40308b0} fill="url(#paint0_linear_reset_2)" fillOpacity="0.5" />
            </g>
            <defs>
              <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_reset_2" x1="0" x2="2980.52" y1="0" y2="2929.62">
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

function LoadingFallback() {
  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-200px)]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#179a65] via-green-600 to-[#0F766E]" />
      <div className="relative z-10 flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    </div>
  );
}

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateToken = async () => {
      try {
        const supabase = createSupabaseBrowserClient();

        // Check for error from Supabase redirect
        const errorDescription = searchParams.get('error_description');
        if (errorDescription) {
          setError(decodeURIComponent(errorDescription));
          setIsValidating(false);
          return;
        }

        // Check if we have a session (token was valid)
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setIsValidToken(true);
        } else {
          // Try to exchange the code if present
          const code = searchParams.get('code');
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              setError('Invalid or expired reset link. Please request a new password reset.');
            } else {
              setIsValidToken(true);
            }
          } else {
            setError('Invalid reset link. Please request a new password reset.');
          }
        }
      } catch {
        setError('An error occurred. Please try again.');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [searchParams]);

  const handleResetComplete = () => {
    setResetComplete(true);
    // Redirect to login after a short delay
    setTimeout(() => {
      router.push('/login');
    }, 3000);
  };

  if (isValidating) {
    return <LoadingFallback />;
  }

  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-200px)]">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#179a65] via-green-600 to-[#0F766E]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.08),transparent_40%)]" />
      <BackgroundVectors />

      <div className="relative z-10 flex items-center justify-center px-4 py-24 md:py-32">
        <div className="w-full max-w-md">
          {/* Back to Login Link */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6"
          >
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm font-medium"
            >
              <ArrowLeft className="size-4" />
              Back to login
            </Link>
          </motion.div>

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10">
              {resetComplete ? (
                /* Success State */
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="rounded-full bg-green-100 p-4">
                    <CheckCircle2 className="size-8 text-green-600" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Password Updated
                    </h2>
                    <p className="text-sm text-gray-600">
                      Your password has been successfully reset. Redirecting you to login...
                    </p>
                  </div>
                  <Link href="/login">
                    <button
                      type="button"
                      className="mt-4 text-[#179a65] hover:text-green-700 font-medium text-sm"
                    >
                      Go to login now
                    </button>
                  </Link>
                </div>
              ) : error ? (
                /* Error State */
                <div className="space-y-6">
                  <div className="mb-8 space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900">Reset Failed</h1>
                    <p className="text-gray-500">{error}</p>
                  </div>
                  <Link href="/forgot-password">
                    <button
                      type="button"
                      className="w-full bg-[#179a65] hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                    >
                      Request New Reset Link
                    </button>
                  </Link>
                </div>
              ) : isValidToken ? (
                /* Reset Form */
                <>
                  <div className="mb-8 space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900">Create New Password</h1>
                    <p className="text-gray-500">
                      Enter your new password below. Make sure it&apos;s at least 8 characters.
                    </p>
                  </div>
                  <ResetPasswordForm onSuccess={handleResetComplete} />
                </>
              ) : null}

              {/* Trust Badge */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <div className="rounded-full bg-[#179a65]/10 p-1.5">
                    <Shield className="size-3 text-[#179a65]" />
                  </div>
                  <span>Your password is securely encrypted</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
