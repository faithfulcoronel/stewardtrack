'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';

interface HeroProps {
  badge?: {
    icon?: React.ReactNode;
    text: string;
  };
  headline: string;
  subheadline: string;
  primaryCTA: {
    text: string;
    href: string;
  };
  secondaryCTA?: {
    text: string;
    href: string;
  };
  trustIndicator?: string;
  imageUrl?: string;
}

export function Hero({
  badge,
  headline,
  subheadline,
  primaryCTA,
  secondaryCTA,
  trustIndicator,
  imageUrl,
}: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
      {/* Background Gradient Orbs */}
      <div className="absolute -left-32 -top-32 size-64 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
      <div className="absolute -right-20 top-1/2 size-96 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />

      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            {badge && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm">
                  {badge.icon}
                  {badge.text}
                </span>
              </motion.div>
            )}

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              {headline}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-lg text-muted-foreground sm:text-xl"
            >
              {subheadline}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-col gap-4 sm:flex-row"
            >
              <Button asChild size="lg" className="group gap-2 shadow-lg hover:shadow-xl transition-all">
                <Link href={primaryCTA.href}>
                  {primaryCTA.text}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              {secondaryCTA && (
                <Button asChild size="lg" variant="outline" className="gap-2">
                  <Link href={secondaryCTA.href}>
                    <Play className="size-4" />
                    {secondaryCTA.text}
                  </Link>
                </Button>
              )}
            </motion.div>

            {trustIndicator && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="text-sm text-muted-foreground"
              >
                {trustIndicator}
              </motion.p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-4 shadow-2xl backdrop-blur-sm sm:p-6 lg:p-8">
              <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="StewardTrack Dashboard Preview"
                    className="rounded-lg object-cover w-full h-full"
                  />
                ) : (
                  <div className="text-center space-y-4">
                    <div className="text-6xl">🏛️</div>
                    <p className="text-sm text-muted-foreground">Dashboard Preview</p>
                  </div>
                )}
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -bottom-4 -right-4 size-24 rounded-full bg-accent/20 blur-2xl" aria-hidden="true" />
            <div className="absolute -top-4 -left-4 size-32 rounded-full bg-primary/20 blur-2xl" aria-hidden="true" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
