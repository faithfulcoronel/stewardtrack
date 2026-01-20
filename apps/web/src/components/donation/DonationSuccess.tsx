'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  Heart,
  Sparkles,
  ArrowRight,
  Share2,
  Download,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DonationSuccessProps {
  donationId: string;
  churchName: string;
  amount?: number;
}

const CELEBRATION_MESSAGES = [
  'Thank you for your generosity!',
  'Your gift makes a difference!',
  'You are a blessing!',
  'God bless your giving heart!',
];

export function DonationSuccess({ donationId, churchName, amount }: DonationSuccessProps) {
  const [showContent, setShowContent] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    // Trigger confetti celebration
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Launch confetti from both sides
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#179a65', '#22c55e', '#4ade80', '#86efac', '#fbbf24', '#f59e0b'],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#179a65', '#22c55e', '#4ade80', '#86efac', '#fbbf24', '#f59e0b'],
      });
    }, 250);

    // Show content after initial animation
    const contentTimer = setTimeout(() => setShowContent(true), 500);

    // Cycle through messages
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % CELEBRATION_MESSAGES.length);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(contentTimer);
      clearInterval(messageInterval);
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#179a65] via-green-600 to-[#0F766E] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Floating hearts */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-white/10"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
              y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 50,
            }}
            animate={{
              y: -50,
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              ease: 'linear',
              delay: Math.random() * 5,
            }}
          >
            <Heart className="w-6 h-6 fill-current" />
          </motion.div>
        ))}
      </div>

      {/* Radial gradient overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1),transparent_40%)]" />

      {/* Main Content */}
      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 20,
              duration: 0.6
            }}
            className="relative z-10 w-full max-w-md"
          >
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              {/* Success Header */}
              <div className="relative bg-gradient-to-br from-[#179a65] to-green-600 p-8 text-center">
                {/* Animated Check Circle */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    delay: 0.2
                  }}
                  className="relative mx-auto w-24 h-24 mb-4"
                >
                  {/* Outer ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-white/30"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [0.8, 1.2, 1], opacity: [0, 1, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  {/* Inner circle with check */}
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white shadow-lg">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4, type: 'spring' }}
                    >
                      <CheckCircle2 className="w-14 h-14 text-[#179a65]" />
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
                  Donation Complete!
                </motion.h1>

                {/* Rotating Messages */}
                <AnimatePresence mode="wait">
                  <motion.p
                    key={messageIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="text-white/90 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {CELEBRATION_MESSAGES[messageIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Content Body */}
              <div className="p-6 space-y-6">
                {/* Amount Display */}
                {amount && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-center"
                  >
                    <p className="text-sm text-muted-foreground mb-1">You donated</p>
                    <p className="text-4xl font-bold text-[#179a65]">
                      {formatCurrency(amount)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">to {churchName}</p>
                  </motion.div>
                )}

                {/* Reference Number */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="bg-muted/50 rounded-xl p-4 text-center"
                >
                  <p className="text-xs text-muted-foreground mb-1">Reference Number</p>
                  <p className="font-mono font-semibold text-sm text-foreground break-all">
                    {donationId}
                  </p>
                </motion.div>

                {/* Info Message */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-sm text-center text-muted-foreground"
                >
                  A confirmation email has been sent to your inbox.
                  Thank you for supporting {churchName}!
                </motion.p>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="space-y-3"
                >
                  <Button
                    asChild
                    className="w-full h-12 text-base font-semibold"
                  >
                    <Link href="/">
                      Return Home
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 h-10"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: `I just donated to ${churchName}!`,
                            text: 'Join me in supporting our church community.',
                          });
                        }
                      }}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-10"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Receipt
                    </Button>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Bottom flourish */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="text-center text-white/60 text-xs mt-4"
            >
              &ldquo;Each of you should give what you have decided in your heart to give&rdquo;
              <br />
              — 2 Corinthians 9:7
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
