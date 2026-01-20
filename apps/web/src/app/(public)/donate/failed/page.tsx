'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { XCircle, RefreshCw, Home, AlertTriangle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

function DonationFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [failureData, setFailureData] = useState<{
    donationId: string;
    churchName: string;
    errorMessage?: string;
    tenantToken?: string;
  } | null>(null);

  useEffect(() => {
    // Get failure info from URL params (set by Xendit redirect)
    const donationId = searchParams.get('donation_id') || searchParams.get('external_id') || 'Unknown';
    const churchName = searchParams.get('church') || 'the church';
    const errorMessage = searchParams.get('error') || searchParams.get('failure_code');
    const tenantToken = searchParams.get('tenant');

    setFailureData({
      donationId,
      churchName,
      errorMessage,
      tenantToken,
    });
  }, [searchParams]);

  const handleRetry = () => {
    if (failureData?.tenantToken) {
      router.push(`/donate/${failureData.tenantToken}`);
    } else {
      router.back();
    }
  };

  if (!failureData) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-red-500 via-rose-600 to-pink-600">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 via-rose-600 to-pink-600 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.08),transparent_40%)]" />

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 20,
          duration: 0.6,
        }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Error Header */}
          <div className="relative bg-gradient-to-br from-red-500 to-rose-600 p-8 text-center">
            {/* Animated X Circle */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: 0.2,
              }}
              className="relative mx-auto w-24 h-24 mb-4"
            >
              {/* Pulsing ring */}
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-white/30"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              {/* Inner circle with X */}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white shadow-lg">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring' }}
                >
                  <XCircle className="w-14 h-14 text-red-500" />
                </motion.div>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-2xl sm:text-3xl font-bold text-white mb-2"
            >
              Payment Failed
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-white/90"
            >
              We couldn&apos;t process your donation
            </motion.p>
          </div>

          {/* Content Body */}
          <div className="p-6 space-y-6">
            {/* Error Message */}
            {failureData.errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4"
              >
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">What happened?</p>
                  <p className="text-sm text-red-600 mt-1">{failureData.errorMessage}</p>
                </div>
              </motion.div>
            )}

            {/* Reference Number */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-muted/50 rounded-xl p-4 text-center"
            >
              <p className="text-xs text-muted-foreground mb-1">Reference Number</p>
              <p className="font-mono font-semibold text-sm text-foreground break-all">
                {failureData.donationId}
              </p>
            </motion.div>

            {/* Help Text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-sm text-center text-muted-foreground space-y-2"
            >
              <p>Don&apos;t worry! Your payment method was not charged.</p>
              <p>Common reasons for payment failure:</p>
              <ul className="text-left text-xs space-y-1 bg-gray-50 rounded-lg p-3">
                <li>• Insufficient balance or credit limit</li>
                <li>• Network connectivity issues</li>
                <li>• Transaction timeout</li>
                <li>• Bank security restrictions</li>
              </ul>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="space-y-3"
            >
              <Button onClick={handleRetry} className="w-full h-12 text-base font-semibold">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>

              <Button variant="outline" asChild className="w-full h-10">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  Return Home
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Bottom message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center text-white/60 text-xs mt-4"
        >
          Need help? Contact {failureData.churchName} for assistance.
        </motion.p>
      </motion.div>
    </div>
  );
}

export default function DonationFailedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-red-500 via-rose-600 to-pink-600">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      }
    >
      <DonationFailedContent />
    </Suspense>
  );
}
