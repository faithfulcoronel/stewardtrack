import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Metric = {
  label: string;
  value: string;
};

type ActionConfig = {
  id?: string;
  kind?: string;
  config?: Record<string, unknown>;
};

export interface HeroSectionProps {
  eyebrow?: string;
  headline?: string;
  description?: string;
  metrics?: Metric[] | { items?: Metric[] } | null;
  primaryCta?: ActionConfig | null;
  secondaryCta?: ActionConfig | null;
  children?: React.ReactNode;
}

export function HeroSection({
  eyebrow,
  headline,
  description,
  metrics,
  primaryCta,
  secondaryCta,
  children
}: HeroSectionProps) {
  const metricItems = Array.isArray(metrics)
    ? metrics
    : metrics && typeof metrics === 'object'
    ? (metrics.items as Metric[] | undefined) ?? []
    : [];

  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-16 shadow-xl sm:px-12 sm:py-24">
      <div className="mx-auto max-w-3xl text-center text-white">
        {eyebrow && <p className="text-sm font-semibold uppercase tracking-wide text-slate-300">{eyebrow}</p>}
        {headline && (
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{headline}</h1>
        )}
        {description && (
          <p className="mt-5 text-lg text-slate-200 sm:text-xl">{description}</p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {renderAction(primaryCta, 'primary')}
          {renderAction(secondaryCta, 'ghost')}
        </div>
        {metricItems.length > 0 && (
          <dl className="mt-12 grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
            {metricItems.map((metric) => (
              <div key={metric.label} className="rounded-xl bg-slate-800/70 px-5 py-4">
                <dt className="text-sm font-medium text-slate-300">{metric.label}</dt>
                <dd className="mt-1 text-2xl font-semibold text-white">{metric.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {children}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_55%)]" />
    </section>
  );
}

function renderAction(action: ActionConfig | null | undefined, fallbackVariant: string) {
  if (!action) {
    return null;
  }
  const config = action.config ?? {};
  const href = typeof config.url === 'string' ? config.url : '#';
  const label = typeof config.label === 'string' ? config.label : 'Learn more';
  const variant = typeof config.variant === 'string' ? config.variant : fallbackVariant;
  return (
    <Link
      key={action.id ?? label}
      href={href}
      className={cn(
        'inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        buttonStyles(variant)
      )}
    >
      {label}
    </Link>
  );
}

function buttonStyles(variant: string) {
  switch (variant) {
    case 'ghost':
      return 'bg-white/10 text-white hover:bg-white/20 focus-visible:ring-white/60';
    case 'secondary':
      return 'bg-slate-100 text-slate-900 hover:bg-white focus-visible:ring-slate-200';
    case 'primary':
    default:
      return 'bg-white text-slate-900 hover:bg-slate-100 focus-visible:ring-white/60';
  }
}
