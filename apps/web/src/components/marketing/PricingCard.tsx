'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles } from 'lucide-react';

interface PricingCardProps {
  tier: string;
  price: string | number;
  period?: string;
  description: string;
  features: string[];
  isFeatured?: boolean;
  ctaText?: string;
  ctaHref?: string;
  index?: number;
}

export function PricingCard({
  tier,
  price,
  period = '/month',
  description,
  features,
  isFeatured = false,
  ctaText = 'Get Started',
  ctaHref = '/signup',
  index = 0,
}: PricingCardProps) {
  const displayPrice = typeof price === 'number' ? `$${price}` : price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      className={`relative flex flex-col overflow-hidden rounded-3xl border ${
        isFeatured
          ? 'border-primary/40 bg-gradient-to-br from-primary/5 to-accent/5 shadow-xl'
          : 'border-border/60 bg-card/50'
      } p-8 backdrop-blur-sm transition-all hover:shadow-lg`}
    >
      {isFeatured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground px-3 py-1 shadow-lg">
            <Sparkles className="mr-1 inline size-3" />
            Most Popular
          </Badge>
        </div>
      )}

      <div className="flex-1 space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold capitalize text-foreground">{tier}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold text-foreground">{displayPrice}</span>
          {typeof price === 'number' && price > 0 && (
            <span className="text-muted-foreground">{period}</span>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Features included:</h4>
          <ul className="space-y-3">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-foreground/90">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8">
        <Button
          asChild
          className="w-full"
          variant={isFeatured ? 'default' : 'outline'}
          size="lg"
        >
          <Link href={ctaHref}>{ctaText}</Link>
        </Button>
      </div>
    </motion.div>
  );
}
