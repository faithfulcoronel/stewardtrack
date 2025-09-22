import React from "react";

import { cn } from "@/lib/utils";
import { ActionsRow, normalizeList, type ActionConfig } from "./shared";

const toneStyles = {
  surface: {
    container: "border-border/70 bg-card/90 text-foreground",
    subtle: "text-muted-foreground",
  },
  light: {
    container:
      "border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-white",
    subtle: "text-slate-600 dark:text-slate-200/80",
  },
  dark: {
    container: "border-slate-800 bg-slate-950 text-white",
    subtle: "text-slate-300/90",
  },
  brand: {
    container: "border-transparent bg-gradient-to-br from-primary/90 via-primary to-primary/70 text-primary-foreground",
    subtle: "text-primary-foreground/80",
  },
  marine: {
    container: "border-transparent bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-600 text-white",
    subtle: "text-white/80",
  },
  forest: {
    container: "border-transparent bg-gradient-to-br from-emerald-500 to-teal-500 text-white",
    subtle: "text-emerald-50/80",
  },
  amber: {
    container: "border-transparent bg-gradient-to-br from-amber-200 via-orange-200 to-amber-100 text-amber-900",
    subtle: "text-amber-800/80",
  },
  violet: {
    container: "border-transparent bg-gradient-to-br from-violet-500 via-fuchsia-500 to-purple-600 text-white",
    subtle: "text-violet-50/80",
  },
  slate: {
    container: "border-transparent bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-white",
    subtle: "text-slate-200/80",
  },
  frost: {
    container:
      "border-transparent bg-gradient-to-br from-slate-100 via-slate-200 to-white text-slate-900 dark:from-slate-500/40 dark:via-slate-600/40 dark:to-slate-700/30 dark:text-white",
    subtle: "text-slate-600 dark:text-slate-200/80",
  },
  blossom: {
    container: "border-transparent bg-gradient-to-br from-rose-500 via-pink-500 to-rose-600 text-white",
    subtle: "text-rose-50/80",
  },
  cobalt: {
    container: "border-transparent bg-gradient-to-br from-blue-900 via-indigo-800 to-indigo-900 text-white",
    subtle: "text-indigo-100/80",
  },
  sand: {
    container: "border-transparent bg-gradient-to-br from-amber-100 via-yellow-100 to-orange-100 text-amber-900",
    subtle: "text-amber-700/80",
  },
} as const;

type BentoTone = keyof typeof toneStyles;

type Alignment = "start" | "center" | "end";

export type BentoGridVariant =
  | "product-orbit"
  | "analytics-pulse"
  | "ops-horizon"
  | "ai-laboratory"
  | "platform-compass"
  | "commerce-meridian"
  | "revops-symmetry"
  | "community-constellation"
  | "support-lattice"
  | "sustainability-lab"
  | "healthcare-synthesis"
  | "executive-lens";

type BentoMetricSentiment = "positive" | "negative" | "neutral" | null | undefined;

export interface BentoMetric {
  label?: string;
  value?: string;
  change?: string;
  sentiment?: BentoMetricSentiment;
}

interface BentoCardInput {
  eyebrow?: string;
  badge?: string;
  title?: string;
  description?: string;
  stat?: string;
  icon?: string;
  footnote?: string;
  tone?: BentoTone;
  alignment?: Alignment;
  bullets?: string[] | { items?: string[] } | null;
}

interface BentoCard
  extends Omit<BentoCardInput, "bullets" | "tone" | "alignment"> {
  bullets: string[];
  tone: BentoTone;
  alignment: Alignment;
}

export interface BentoGridProps {
  eyebrow?: string;
  headline?: string;
  description?: string;
  variant?: BentoGridVariant | string | null;
  cards?: BentoCardInput[] | { items?: BentoCardInput[] } | null;
  metrics?: BentoMetric[] | { items?: BentoMetric[] } | null;
  logos?: string[] | { items?: string[] } | null;
  primaryCta?: ActionConfig | null;
  secondaryCta?: ActionConfig | null;
  children?: React.ReactNode;
}

type VariantLayout = {
  section?: string;
  grid: string;
  cardClasses: string[];
};

const variantLayouts: Record<BentoGridVariant, VariantLayout> = {
  "product-orbit": {
    grid: "grid gap-6 sm:grid-cols-2 lg:grid-cols-6",
    cardClasses: [
      "lg:col-span-4 lg:row-span-2",
      "lg:col-span-2 lg:row-span-2",
      "lg:col-span-3",
      "lg:col-span-3",
      "lg:col-span-2",
      "lg:col-span-2",
    ],
  },
  "analytics-pulse": {
    grid: "grid gap-6 sm:grid-cols-2 lg:grid-cols-5",
    cardClasses: [
      "lg:col-span-3 lg:row-span-2",
      "lg:col-span-2",
      "lg:col-span-2",
      "lg:col-span-3",
      "lg:col-span-2 lg:row-span-2",
      "lg:col-span-2",
    ],
  },
  "ops-horizon": {
    grid: "grid gap-6 sm:grid-cols-2 lg:grid-cols-6",
    cardClasses: [
      "lg:col-span-3 lg:row-span-2",
      "lg:col-span-3",
      "lg:col-span-2",
      "lg:col-span-2",
      "lg:col-span-4",
      "lg:col-span-2",
    ],
  },
  "ai-laboratory": {
    grid: "grid gap-6 sm:grid-cols-2 lg:grid-cols-5",
    cardClasses: [
      "lg:col-span-3 lg:row-span-2",
      "lg:col-span-2",
      "lg:col-span-2",
      "lg:col-span-3",
      "lg:col-span-2",
      "lg:col-span-2",
    ],
  },
  "platform-compass": {
    grid: "grid gap-6 sm:grid-cols-2 lg:grid-cols-6",
    cardClasses: [
      "lg:col-span-4 lg:row-span-2",
      "lg:col-span-2",
      "lg:col-span-2",
      "lg:col-span-2",
      "lg:col-span-2",
      "lg:col-span-4",
    ],
  },
  "commerce-meridian": {
    grid: "grid gap-6 sm:grid-cols-2 lg:grid-cols-5",
    cardClasses: [
      "lg:col-span-3 lg:row-span-2",
      "lg:col-span-2",
      "lg:col-span-2",
      "lg:col-span-3",
      "lg:col-span-2",
      "lg:col-span-2",
    ],
  },
  "revops-symmetry": {
    grid: "grid gap-6 sm:grid-cols-2 lg:grid-cols-6",
    cardClasses: [
      "lg:col-span-3 lg:row-span-2",
      "lg:col-span-3",
      "lg:col-span-2",
      "lg:col-span-2",
      "lg:col-span-2",
      "lg:col-span-4",
    ],
  },
  "community-constellation": {
    grid: "grid gap-6 sm:grid-cols-2 lg:grid-cols-6",
    cardClasses: [
      "lg:col-span-4 lg:row-span-2",
      "lg:col-span-2",
      "lg:col-span-3",
      "lg:col-span-3",
      "lg:col-span-2",
      "lg:col-span-2",
    ],
  },
  "support-lattice": {
    grid: "grid gap-6 sm:grid-cols-2 lg:grid-cols-5",
    cardClasses: [
      "lg:col-span-3 lg:row-span-2",
      "lg:col-span-2",
      "lg:col-span-2",
      "lg:col-span-3",
      "lg:col-span-2",
      "lg:col-span-2 lg:row-span-2",
    ],
  },
  "sustainability-lab": {
    grid: "grid gap-6 sm:grid-cols-2 lg:grid-cols-6",
    cardClasses: [
      "lg:col-span-3 lg:row-span-2",
      "lg:col-span-3",
      "lg:col-span-2",
      "lg:col-span-2",
      "lg:col-span-4",
      "lg:col-span-2",
    ],
  },
  "healthcare-synthesis": {
    grid: "grid gap-6 sm:grid-cols-2 lg:grid-cols-5",
    cardClasses: [
      "lg:col-span-3 lg:row-span-2",
      "lg:col-span-2",
      "lg:col-span-2",
      "lg:col-span-3",
      "lg:col-span-2 lg:row-span-2",
      "lg:col-span-2",
    ],
  },
  "executive-lens": {
    grid: "grid gap-6 sm:grid-cols-2 lg:grid-cols-6",
    cardClasses: [
      "lg:col-span-4 lg:row-span-2",
      "lg:col-span-2",
      "lg:col-span-2",
      "lg:col-span-2",
      "lg:col-span-2",
      "lg:col-span-2",
    ],
  },
};

const alignmentStyles: Record<Alignment, string> = {
  start: "items-start text-left",
  center: "items-center text-center",
  end: "items-end text-right",
};

const defaultVariant: BentoGridVariant = "product-orbit";

function resolveVariant(variant: string | null | undefined): BentoGridVariant {
  if (!variant) {
    return defaultVariant;
  }
  if ((variantLayouts as Record<string, VariantLayout>)[variant]) {
    return variant as BentoGridVariant;
  }
  return defaultVariant;
}

function normalizeCard(card: BentoCardInput | null | undefined): BentoCard {
  const tone = card?.tone && toneStyles[card.tone] ? card.tone : ("surface" as BentoTone);
  return {
    eyebrow: card?.eyebrow,
    badge: card?.badge,
    title: card?.title,
    description: card?.description,
    stat: card?.stat,
    icon: card?.icon,
    footnote: card?.footnote,
    tone,
    alignment: card?.alignment ?? "start",
    bullets: normalizeList<string>(card?.bullets),
  };
}

function resolveToneClasses(tone: BentoTone) {
  const preset = toneStyles[tone] ?? toneStyles.surface;
  return {
    container: preset.container,
    subtle: preset.subtle,
  };
}

function metricAccent(sentiment: BentoMetricSentiment) {
  switch (sentiment) {
    case "positive":
      return "text-emerald-500";
    case "negative":
      return "text-rose-500";
    case "neutral":
    default:
      return "text-muted-foreground";
  }
}

export function BentoGrid(props: BentoGridProps) {
  const variant = resolveVariant(props.variant ?? undefined);
  const layout = variantLayouts[variant] ?? variantLayouts[defaultVariant];
  const cards = normalizeList<BentoCardInput>(props.cards).map(normalizeCard);
  const metrics = normalizeList<BentoMetric>(props.metrics);
  const logos = normalizeList<string>(props.logos);

  return (
    <section className={cn("w-full py-16 sm:py-24", layout.section)}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-4">
            {props.eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                {props.eyebrow}
              </p>
            )}
            {props.headline && (
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {props.headline}
              </h2>
            )}
            {props.description && <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>}
            {props.children}
            {(props.primaryCta || props.secondaryCta) && (
              <ActionsRow
                primary={props.primaryCta}
                secondary={props.secondaryCta}
                className="pt-2"
              />
            )}
          </div>
        </div>

        {metrics.length > 0 && (
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={`${metric.label ?? "metric"}-${metric.value ?? Math.random()}`}
                className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm"
              >
                {metric.label && (
                  <dt className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                    {metric.label}
                  </dt>
                )}
                {metric.value && (
                  <dd className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">
                    {metric.value}
                  </dd>
                )}
                {metric.change && (
                  <p className={cn("mt-3 text-sm font-medium", metricAccent(metric.sentiment))}>
                    {metric.change}
                  </p>
                )}
              </div>
            ))}
          </dl>
        )}

        {metrics.length === 0 && logos.length > 0 && (
          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">
            {logos.map((logo) => (
              <span key={`logo-${logo}`}>{logo}</span>
            ))}
          </div>
        )}

        <div className={cn(layout.grid)}>
          {cards.map((card, index) => {
            const tone = resolveToneClasses(card.tone);
            const alignment = alignmentStyles[card.alignment ?? "start"];
            const layoutClass = layout.cardClasses[index] ?? layout.cardClasses.at(-1) ?? "";
            return (
              <article
                key={`${card.title ?? card.stat ?? card.eyebrow ?? index}`}
                className={cn(
                  "group relative flex min-h-[220px] flex-col gap-4 overflow-hidden rounded-3xl border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:p-8",
                  tone.container,
                  layoutClass,
                  alignment
                )}
              >
                {card.badge && (
                  <span className="inline-flex items-center rounded-full border border-white/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em]">
                    {card.badge}
                  </span>
                )}
                {card.eyebrow && !card.badge && (
                  <span className="text-[11px] font-semibold uppercase tracking-[0.35em] opacity-80">
                    {card.eyebrow}
                  </span>
                )}
                {card.icon && (
                  <span className="text-3xl leading-none">{card.icon}</span>
                )}
                {card.stat && (
                  <p className="text-4xl font-semibold tracking-tight sm:text-5xl">{card.stat}</p>
                )}
                {card.title && (
                  <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">{card.title}</h3>
                )}
                {card.description && (
                  <p className={cn("text-sm", tone.subtle)}>{card.description}</p>
                )}
                {card.bullets.length > 0 && (
                  <ul className="mt-2 space-y-2 text-sm">
                    {card.bullets.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="inline-flex size-1.5 rounded-full bg-current/60" />
                        <span className={cn("text-left", tone.subtle)}>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {card.footnote && (
                  <p className={cn("mt-auto text-xs", tone.subtle)}>{card.footnote}</p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

