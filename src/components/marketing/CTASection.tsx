'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface CTASectionProps {
  headline: string;
  description?: string;
  primaryCTA: {
    text: string;
    href: string;
  };
  secondaryCTA?: {
    text: string;
    href: string;
  };
  variant?: 'gradient' | 'simple';
}

export function CTASection({
  headline,
  description,
  primaryCTA,
  secondaryCTA,
  variant = 'gradient',
}: CTASectionProps) {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className={`mx-auto max-w-4xl overflow-hidden rounded-3xl ${
          variant === 'gradient'
            ? 'bg-gradient-to-br from-primary to-primary/80'
            : 'border border-border/60 bg-card/80 backdrop-blur-sm'
        } p-8 text-center shadow-2xl sm:p-12 lg:p-16`}
      >
        <h2
          className={`text-3xl font-bold sm:text-4xl lg:text-5xl ${
            variant === 'gradient' ? 'text-primary-foreground' : 'text-foreground'
          }`}
        >
          {headline}
        </h2>

        {description && (
          <p
            className={`mt-4 text-lg sm:text-xl ${
              variant === 'gradient' ? 'text-primary-foreground/90' : 'text-muted-foreground'
            }`}
          >
            {description}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button
            asChild
            size="lg"
            variant={variant === 'gradient' ? 'secondary' : 'default'}
            className="group gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            <Link href={primaryCTA.href}>
              {primaryCTA.text}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>

          {secondaryCTA && (
            <Button
              asChild
              size="lg"
              variant={variant === 'gradient' ? 'outline' : 'outline'}
              className={variant === 'gradient' ? 'border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10' : ''}
            >
              <Link href={secondaryCTA.href}>
                {secondaryCTA.text}
              </Link>
            </Button>
          )}
        </div>
      </motion.div>
    </section>
  );
}
