'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  XCircle,
  RefreshCw,
  Home,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

function RegistrationHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/landing_logo_with_name.svg"
            alt="StewardTrack"
            width={160}
            height={40}
            className="h-8 w-auto"
            priority
          />
        </Link>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="py-8 text-center">
      <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
        <span>Powered by</span>
        <Image
          src="/landing_logo_with_name.svg"
          alt="StewardTrack"
          width={100}
          height={24}
          className="h-5 w-auto opacity-50"
        />
      </div>
    </footer>
  );
}

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const registrationId = searchParams.get('registration_id');

  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentUrl = async () => {
      if (!registrationId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/register/status/${registrationId}`);
        const result = await response.json();

        if (response.ok && result.data?.paymentUrl) {
          setPaymentUrl(result.data.paymentUrl);
        }
      } catch (err) {
        console.error('Error fetching registration:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentUrl();
  }, [registrationId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 via-white to-red-50/50">
        <RegistrationHeader />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
          <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 via-white to-red-50/50">
      <RegistrationHeader />
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="backdrop-blur-xl bg-white/70 rounded-2xl p-8 shadow-xl text-center max-w-md w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center"
          >
            <XCircle className="w-12 h-12 text-white" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl sm:text-3xl font-bold text-gray-900 font-heading mb-2"
          >
            Payment Failed
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 mb-8"
          >
            We were unable to process your payment. Your registration is on hold until payment is completed.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            {paymentUrl && (
              <Button
                asChild
                className="w-full h-12 bg-gradient-to-r from-[#179a65] to-[#10B981] hover:from-[#148a5a] hover:to-[#0fa076]"
              >
                <a href={paymentUrl}>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Try Payment Again
                </a>
              </Button>
            )}

            <Button asChild variant="outline" className="w-full h-12">
              <Link href="/">
                <Home className="w-5 h-5 mr-2" />
                Return Home
              </Link>
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-xs text-gray-500 mt-6"
          >
            If you continue to experience issues, please contact the event organizer.
          </motion.p>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-red-50 via-white to-red-50/50 flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
        </div>
      }
    >
      <PaymentFailedContent />
    </Suspense>
  );
}
