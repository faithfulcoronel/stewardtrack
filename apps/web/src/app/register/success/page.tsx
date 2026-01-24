'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Building2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RegistrationDetails {
  id: string;
  status: string;
  confirmationCode: string;
  guestName: string;
  guestEmail: string;
  scheduleName: string;
  scheduleLocation?: string;
  ministryName: string;
  tenantName: string;
  occurrenceDate: string;
  occurrenceTime: string;
  paymentStatus: string;
  paymentAmount?: number;
  paymentCurrency?: string;
  paidAt?: string;
}

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

const fireConfetti = () => {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval = window.setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#179a65', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0'],
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#179a65', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0'],
    });
  }, 250);
};

const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: currency || 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const registrationId = searchParams.get('registration_id');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<RegistrationDetails | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!registrationId) {
        setError('Registration not found');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/register/status/${registrationId}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load registration');
        }

        setDetails(result.data);

        // Fire confetti on successful payment
        if (result.data.paymentStatus === 'paid') {
          setTimeout(() => fireConfetti(), 500);
        }
      } catch (err) {
        console.error('Error fetching registration:', err);
        setError(err instanceof Error ? err.message : 'Failed to load registration');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [registrationId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] via-white to-[#ecfdf5]">
        <RegistrationHeader />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="backdrop-blur-xl bg-white/70 rounded-2xl p-8 shadow-lg text-center"
          >
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-[#179a65]" />
            <p className="text-gray-600 font-medium">Confirming your payment...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] via-white to-[#ecfdf5]">
        <RegistrationHeader />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="backdrop-blur-xl bg-white/70 rounded-2xl p-8 shadow-lg text-center max-w-md"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 font-heading mb-2">
              Unable to Load Registration
            </h2>
            <p className="text-gray-600 mb-6">{error || 'Registration not found'}</p>
            <Button asChild>
              <Link href="/">Return Home</Link>
            </Button>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] via-white to-[#ecfdf5]">
      <RegistrationHeader />
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="backdrop-blur-xl bg-white/70 rounded-2xl p-8 shadow-xl shadow-[#179a65]/10 text-center max-w-md w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#179a65] to-[#10B981] flex items-center justify-center"
          >
            <CheckCircle2 className="w-12 h-12 text-white" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl sm:text-3xl font-bold text-gray-900 font-heading mb-2"
          >
            Payment Successful!
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 mb-6"
          >
            Your registration is now confirmed. We look forward to seeing you!
          </motion.p>

          {details.paymentAmount && details.paymentCurrency && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="bg-[#179a65]/10 rounded-xl p-4 mb-4"
            >
              <p className="text-sm text-gray-600 mb-1">Amount Paid</p>
              <p className="text-2xl font-bold text-[#179a65]">
                {formatCurrency(details.paymentAmount, details.paymentCurrency)}
              </p>
            </motion.div>
          )}

          {details.confirmationCode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gray-50 rounded-xl p-4 mb-6"
            >
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Confirmation Code
              </p>
              <p className="text-3xl font-mono font-bold tracking-wider text-[#179a65]">
                {details.confirmationCode}
              </p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="border-t border-gray-200 pt-6 text-left space-y-3"
          >
            <h3 className="font-semibold text-gray-900">{details.scheduleName}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building2 className="w-4 h-4" />
              {details.tenantName}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              {details.occurrenceDate} at {details.occurrenceTime}
            </div>
            {details.scheduleLocation && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                {details.scheduleLocation}
              </div>
            )}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-xs text-gray-500 mt-6"
          >
            A confirmation email has been sent to {details.guestEmail}
          </motion.p>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] via-white to-[#ecfdf5] flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#179a65]" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
