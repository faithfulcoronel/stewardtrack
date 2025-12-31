/* eslint-disable @next/next/no-img-element */
import React from "react";

import { cn } from "@/lib/utils";
import { ActionsRow, type ActionConfig, normalizeList } from "./shared";

type FeatureVariant =
  | "icon-grid"
  | "split"
  | "media"
  | "timeline"
  | "metrics"
  | "offset"
  | "testimonial"
  | "logos"
  | "accent"
  | "steps"
  | "callout"
  | "columns";

type FeatureItem = {
  title: string;
  description?: string;
  icon?: string;
  badge?: string;
  href?: string;
};

type MetricItem = {
  label: string;
  value: string;
  caption?: string;
};

type StepItem = {
  title: string;
  description?: string;
  duration?: string;
};

type ColumnItem = {
  title?: string;
  description?: string;
  items?: FeatureItem[] | { items?: FeatureItem[] } | null;
};

type ImageAsset = {
  src?: string;
  alt?: string;
};

type Testimonial = {
  quote?: string;
  author?: string;
  role?: string;
};

export interface FeatureSectionProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  highlight?: string;
  footnote?: string;
  variant?: FeatureVariant;
  features?: FeatureItem[] | { items?: FeatureItem[] } | null;
  metrics?: MetricItem[] | { items?: MetricItem[] } | null;
  steps?: StepItem[] | { items?: StepItem[] } | null;
  columns?: ColumnItem[] | { items?: ColumnItem[] } | null;
  logos?: string[] | { items?: string[] } | null;
  image?: ImageAsset | null;
  testimonial?: Testimonial | null;
  primaryCta?: ActionConfig | null;
  secondaryCta?: ActionConfig | null;
  children?: React.ReactNode;
}

interface NormalizedFeatureProps
  extends Omit<FeatureSectionProps, "features" | "metrics" | "steps" | "columns" | "logos"> {
  features: FeatureItem[];
  metrics: MetricItem[];
  steps: StepItem[];
  columns: Array<Omit<ColumnItem, "items"> & { items: FeatureItem[] }>;
  logos: string[];
}

export function FeatureSection(props: FeatureSectionProps) {
  const normalized: NormalizedFeatureProps = {
    ...props,
    features: normalizeList<FeatureItem>(props.features),
    metrics: normalizeList<MetricItem>(props.metrics),
    steps: normalizeList<StepItem>(props.steps),
    columns: normalizeList<ColumnItem>(props.columns).map((column) => ({
      ...column,
      items: normalizeList<FeatureItem>(column?.items),
    })),
    logos: normalizeList<string>(props.logos),
  };

  switch (normalized.variant ?? "icon-grid") {
    case "split":
      return <SplitFeature {...normalized} />;
    case "media":
      return <MediaFeature {...normalized} />;
    case "timeline":
      return <TimelineFeature {...normalized} />;
    case "metrics":
      return <MetricsFeature {...normalized} />;
    case "offset":
      return <OffsetFeature {...normalized} />;
    case "testimonial":
      return <TestimonialFeature {...normalized} />;
    case "logos":
      return <LogosFeature {...normalized} />;
    case "accent":
      return <AccentFeature {...normalized} />;
    case "steps":
      return <StepsFeature {...normalized} />;
    case "callout":
      return <CalloutFeature {...normalized} />;
    case "columns":
      return <ColumnsFeature {...normalized} />;
    case "icon-grid":
    default:
      return <IconGridFeature {...normalized} />;
  }
}

function IconGridFeature(props: NormalizedFeatureProps) {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-8">
        <header className="mx-auto max-w-3xl space-y-4 text-center">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>
          )}
          {props.title && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.title}</h2>}
          {props.description && <p className="text-base text-muted-foreground">{props.description}</p>}
          {props.children}
        </header>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {props.features.map((feature) => (
            <article
              key={feature.title}
              className="flex h-full flex-col gap-4 rounded-3xl border border-border/50 bg-muted/40 p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              {feature.icon && (
                <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-xl text-primary">
                  {feature.icon}
                </span>
              )}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                {feature.description && <p className="text-sm text-muted-foreground">{feature.description}</p>}
              </div>
              {feature.href && (
                <a
                  href={feature.href}
                  className="mt-auto inline-flex items-center text-sm font-semibold text-primary hover:underline"
                >
                  Learn more
                  <span aria-hidden className="ml-1">
                    →
                  </span>
                </a>
              )}
            </article>
          ))}
        </div>
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} className="justify-center" />
        {props.footnote && <p className="text-center text-sm text-muted-foreground">{props.footnote}</p>}
      </div>
    </section>
  );
}

function SplitFeature(props: NormalizedFeatureProps) {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 sm:px-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-6">
          {props.eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>}
          {props.title && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.title}</h2>}
          {props.description && <p className="text-base text-muted-foreground">{props.description}</p>}
          {props.highlight && (
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
              {props.highlight}
            </div>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
          {props.footnote && <p className="text-sm text-muted-foreground">{props.footnote}</p>}
        </div>
        <div className="grid gap-6">
          {props.features.map((feature) => (
            <div
              key={feature.title}
              className="relative flex gap-5 rounded-3xl border border-border/60 bg-background p-6 shadow-sm"
            >
              {feature.icon && (
                <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-lg text-primary">
                  {feature.icon}
                </span>
              )}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {feature.badge && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-widest text-primary">
                      {feature.badge}
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                </div>
                {feature.description && <p className="text-sm text-muted-foreground">{feature.description}</p>}
                {feature.href && (
                  <a href={feature.href} className="inline-flex items-center text-sm font-semibold text-primary hover:underline">
                    Explore workflow
                    <span aria-hidden className="ml-1">→</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MediaFeature(props: NormalizedFeatureProps) {
  return (
    <section className="bg-slate-950 py-20 text-slate-100">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        <div className="space-y-6">
          {props.eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">{props.eyebrow}</p>}
          {props.title && <h2 className="text-4xl font-semibold text-white sm:text-5xl">{props.title}</h2>}
          {props.description && <p className="text-base text-slate-300">{props.description}</p>}
          {props.highlight && (
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/90">
              {props.highlight}
            </div>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </div>
        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-cyan-500/20 via-slate-900 to-slate-950 blur-3xl" />
          <FeatureImage
            image={props.image}
            fallback="https://images.unsplash.com/photo-1483478550801-ceba5fe50e8e?auto=format&fit=crop&w=1600&q=80"
            className="overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
          />
          {props.features.length > 0 && (
            <div className="-mb-12 mt-6 grid gap-4 rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur sm:grid-cols-2">
              {props.features.slice(0, 4).map((feature) => (
                <div key={feature.title} className="space-y-2">
                  <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
                  {feature.description && <p className="text-xs text-slate-300">{feature.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TimelineFeature(props: NormalizedFeatureProps) {
  return (
    <section className="bg-muted/40 py-20">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 sm:px-8">
        <div className="space-y-4 text-center">
          {props.eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>}
          {props.title && <h2 className="text-4xl font-semibold text-foreground">{props.title}</h2>}
          {props.description && <p className="text-base text-muted-foreground">{props.description}</p>}
        </div>
        <div className="relative">
          <div className="absolute left-4 top-0 h-full w-px bg-border" aria-hidden />
          <ol className="space-y-10">
            {props.steps.map((step, index) => (
              <li key={step.title} className="relative pl-14">
                <span className="absolute left-0 top-1 flex size-8 items-center justify-center rounded-full border border-primary/40 bg-background text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <div className="space-y-2 rounded-3xl border border-border/60 bg-background p-6 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                    {step.duration && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {step.duration}
                      </span>
                    )}
                  </div>
                  {step.description && <p className="text-sm text-muted-foreground">{step.description}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} className="justify-center" />
      </div>
    </section>
  );
}

function MetricsFeature(props: NormalizedFeatureProps) {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          {props.eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>}
          {props.title && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.title}</h2>}
          {props.description && <p className="text-base text-muted-foreground">{props.description}</p>}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
          {props.footnote && <p className="text-sm text-muted-foreground">{props.footnote}</p>}
        </div>
        <div className="space-y-8">
          {props.features.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {props.features.map((feature) => (
                <div key={feature.title} className="flex flex-col gap-2 rounded-3xl border border-border/60 bg-muted/30 p-5">
                  <div className="flex items-center gap-3">
                    {feature.icon && (
                      <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-base text-primary">
                        {feature.icon}
                      </span>
                    )}
                    <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
                  </div>
                  {feature.description && <p className="text-sm text-muted-foreground">{feature.description}</p>}
                </div>
              ))}
            </div>
          )}
          {props.metrics.length > 0 && (
            <div className="rounded-3xl border border-dashed border-primary/40 bg-primary/5 p-6">
              <dl className="grid gap-6 sm:grid-cols-3">
                {props.metrics.map((metric) => (
                  <div key={metric.label} className="space-y-2 text-center">
                    <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">{metric.label}</dt>
                    <dd className="text-3xl font-semibold text-primary">{metric.value}</dd>
                    {metric.caption && <p className="text-xs text-muted-foreground">{metric.caption}</p>}
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function OffsetFeature(props: NormalizedFeatureProps) {
  return (
    <section className="relative bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 py-24 text-slate-100">
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/30 to-transparent" aria-hidden />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 sm:px-8">
        <div className="space-y-4 text-center">
          {props.eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">{props.eyebrow}</p>}
          {props.title && <h2 className="text-4xl font-semibold text-white sm:text-5xl">{props.title}</h2>}
          {props.description && <p className="text-base text-slate-300">{props.description}</p>}
        </div>
        <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <div className="grid gap-6 sm:grid-cols-2">
            {props.features.map((feature) => (
              <div key={feature.title} className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-3">
                  {feature.icon && (
                    <span className="flex size-10 items-center justify-center rounded-full bg-primary/20 text-lg text-white">
                      {feature.icon}
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                </div>
                {feature.description && <p className="text-sm text-slate-300">{feature.description}</p>}
              </div>
            ))}
          </div>
          {props.highlight && (
            <div className="mt-8 rounded-3xl border border-white/15 bg-primary/20 p-5 text-sm text-white">
              {props.highlight}
            </div>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} className="mt-8" />
        </div>
      </div>
    </section>
  );
}

function TestimonialFeature(props: NormalizedFeatureProps) {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="space-y-6">
          {props.eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>}
          {props.title && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.title}</h2>}
          {props.description && <p className="text-base text-muted-foreground">{props.description}</p>}
          <div className="space-y-4">
            {props.features.map((feature) => (
              <div key={feature.title} className="flex gap-4 rounded-3xl border border-border/60 bg-muted/30 p-5">
                {feature.icon && (
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-base text-primary">
                    {feature.icon}
                  </span>
                )}
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
                  {feature.description && <p className="text-sm text-muted-foreground">{feature.description}</p>}
                </div>
              </div>
            ))}
          </div>
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </div>
        <aside className="flex h-full flex-col justify-between rounded-[2rem] border border-border/70 bg-gradient-to-br from-primary/10 via-background to-background p-8 shadow-lg">
          {props.testimonial?.quote && (
            <blockquote className="text-lg font-medium text-foreground/90 sm:text-xl">
              “{props.testimonial.quote}”
            </blockquote>
          )}
          <div className="mt-8 space-y-1 text-sm">
            {props.testimonial?.author && <p className="font-semibold text-foreground">{props.testimonial.author}</p>}
            {props.testimonial?.role && <p className="text-muted-foreground">{props.testimonial.role}</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}

function LogosFeature(props: NormalizedFeatureProps) {
  return (
    <section className="bg-muted/30 py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
          <div className="space-y-6">
            {props.eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>}
            {props.title && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.title}</h2>}
            {props.description && <p className="text-base text-muted-foreground">{props.description}</p>}
            <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
          </div>
          <div className="rounded-3xl border border-border/50 bg-background p-8 shadow-sm">
            {props.features.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2">
                {props.features.map((feature) => (
                  <div key={feature.title} className="space-y-2">
                    <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
                    {feature.description && <p className="text-sm text-muted-foreground">{feature.description}</p>}
                  </div>
                ))}
              </div>
            )}
            {props.logos.length > 0 && (
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {props.logos.map((logo) => (
                  <div
                    key={logo}
                    className="flex h-16 items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/40 px-4 text-sm font-semibold text-muted-foreground"
                  >
                    {logo}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function AccentFeature(props: NormalizedFeatureProps) {
  return (
    <section className="bg-gradient-to-br from-primary/5 via-background to-background py-20">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 sm:px-8">
        <div className="space-y-4 text-center">
          {props.eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>}
          {props.title && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.title}</h2>}
          {props.description && <p className="text-base text-muted-foreground">{props.description}</p>}
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {props.features.map((feature) => (
            <div key={feature.title} className="rounded-3xl border border-primary/20 bg-background/80 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                {feature.icon && (
                  <span className="mt-1 flex size-9 items-center justify-center rounded-full bg-primary/10 text-base text-primary">
                    {feature.icon}
                  </span>
                )}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                  {feature.description && <p className="text-sm text-muted-foreground">{feature.description}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
        {props.highlight && (
          <div className="rounded-3xl border border-primary/30 bg-primary/10 p-5 text-sm text-primary">
            {props.highlight}
          </div>
        )}
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} className="justify-center" />
      </div>
    </section>
  );
}

function StepsFeature(props: NormalizedFeatureProps) {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-8">
        <div className="space-y-4 text-center">
          {props.eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>}
          {props.title && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.title}</h2>}
          {props.description && <p className="text-base text-muted-foreground">{props.description}</p>}
        </div>
        <div className="overflow-hidden rounded-[2.5rem] border border-border/60 bg-muted/30 p-8">
          <ol className="grid gap-6 sm:grid-cols-3">
            {props.steps.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-4 rounded-3xl border border-border/50 bg-background p-6 text-left shadow-sm">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                  {index + 1}
                </span>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                  {step.description && <p className="text-sm text-muted-foreground">{step.description}</p>}
                  {step.duration && <p className="text-xs uppercase tracking-widest text-primary/80">{step.duration}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} className="justify-center" />
      </div>
    </section>
  );
}

function CalloutFeature(props: NormalizedFeatureProps) {
  return (
    <section className="bg-muted/30 py-20">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <div className="space-y-6">
          {props.eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>}
          {props.title && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.title}</h2>}
          {props.description && <p className="text-base text-muted-foreground">{props.description}</p>}
          <div className="space-y-4">
            {props.features.map((feature) => (
              <div key={feature.title} className="flex gap-4 rounded-3xl border border-border/60 bg-background p-5">
                {feature.icon && (
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-base text-primary">
                    {feature.icon}
                  </span>
                )}
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
                  {feature.description && <p className="text-sm text-muted-foreground">{feature.description}</p>}
                </div>
              </div>
            ))}
          </div>
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </div>
        <aside className="relative overflow-hidden rounded-[2.5rem] border border-primary/30 bg-primary/10 p-8 text-primary shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/20" aria-hidden />
          <div className="relative space-y-4">
            {props.highlight && <p className="text-sm font-semibold uppercase tracking-[0.3em]">{props.highlight}</p>}
            {props.footnote && <p className="text-base text-primary/90">{props.footnote}</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}

function ColumnsFeature(props: NormalizedFeatureProps) {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-8">
        <div className="space-y-4 text-center">
          {props.eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>}
          {props.title && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.title}</h2>}
          {props.description && <p className="text-base text-muted-foreground">{props.description}</p>}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {props.columns.map((column, index) => (
            <div
              key={column.title ?? column.description ?? `column-${index}`}
              className="space-y-4 rounded-3xl border border-border/60 bg-muted/30 p-6"
            >
              {column.title && <h3 className="text-lg font-semibold text-foreground">{column.title}</h3>}
              {column.description && <p className="text-sm text-muted-foreground">{column.description}</p>}
              <div className="space-y-3">
                {column.items.map((item) => (
                  <div key={item.title} className="flex gap-3 rounded-2xl border border-border/40 bg-background/80 p-3">
                    {item.icon && (
                      <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm text-primary">
                        {item.icon}
                      </span>
                    )}
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} className="justify-center" />
      </div>
    </section>
  );
}

function FeatureImage({
  image,
  fallback,
  className,
}: {
  image?: ImageAsset | null;
  fallback?: string;
  className?: string;
}) {
  const src = image?.src ?? fallback;
  if (!src) {
    return null;
  }
  return (
    <figure className={cn("w-full", className)}>
      <img src={src} alt={image?.alt ?? "Feature section media"} className="h-full w-full object-cover" loading="lazy" />
    </figure>
  );
}
