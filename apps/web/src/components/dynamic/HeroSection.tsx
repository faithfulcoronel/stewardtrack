'use client';

/* eslint-disable @next/next/no-img-element */
import React from "react";

import { cn } from "@/lib/utils";
import { useTenantChurchImage } from "@/hooks/useTenantChurchImage";
import { ActionsRow, type ActionConfig, normalizeList } from "./shared";

type Metric = {
  label: string;
  value: string;
  caption?: string;
};

type CardItem = {
  title: string;
  description?: string;
};

type Testimonial = {
  quote?: string;
  author?: string;
  role?: string;
};

type VideoAsset = {
  url?: string;
  label?: string;
  thumbnail?: string;
};

type ImageAsset = {
  src?: string;
  alt?: string;
};

type HeroVariant =
  | "aurora"
  | "split"
  | "spotlight"
  | "pattern"
  | "stacked"
  | "newsletter"
  | "stats-panel"
  | "minimal"
  | "testimonial"
  | "logos"
  | "video"
  | "cards";

export interface HeroSectionProps {
  eyebrow?: string;
  headline?: string;
  description?: string;
  highlight?: string;
  badge?: string;
  variant?: HeroVariant;
  metrics?: Metric[] | { items?: Metric[] } | null;
  primaryCta?: ActionConfig | null;
  secondaryCta?: ActionConfig | null;
  highlights?: string[] | { items?: string[] } | null;
  logos?: string[] | { items?: string[] } | null;
  cards?: CardItem[] | { items?: CardItem[] } | null;
  testimonial?: Testimonial | null;
  video?: VideoAsset | null;
  image?: ImageAsset | null;
  form?: {
    placeholder?: string;
    buttonLabel?: string;
    disclaimer?: string;
    url?: string;
  } | null;
  children?: React.ReactNode;
}

interface NormalizedHeroProps
  extends Omit<HeroSectionProps, "metrics" | "logos" | "highlights" | "cards"> {
  metrics: Metric[];
  logos: string[];
  highlights: string[];
  cards: CardItem[];
  tenantImageFallback?: string | null;
}

export function HeroSection(props: HeroSectionProps) {
  // Get tenant's church image for use as fallback
  const { url: tenantChurchImageUrl } = useTenantChurchImage();

  const normalized: NormalizedHeroProps = {
    ...props,
    metrics: normalizeList<Metric>(props.metrics),
    logos: normalizeList<string>(props.logos),
    highlights: normalizeList<string>(props.highlights),
    cards: normalizeList<CardItem>(props.cards),
    tenantImageFallback: tenantChurchImageUrl,
  };

  switch (normalized.variant ?? "aurora") {
    case "split":
      return <SplitHero {...normalized} />;
    case "spotlight":
      return <SpotlightHero {...normalized} />;
    case "pattern":
      return <PatternHero {...normalized} />;
    case "stacked":
      return <StackedHero {...normalized} />;
    case "newsletter":
      return <NewsletterHero {...normalized} />;
    case "stats-panel":
      return <StatsPanelHero {...normalized} />;
    case "minimal":
      return <MinimalHero {...normalized} />;
    case "testimonial":
      return <TestimonialHero {...normalized} />;
    case "logos":
      return <LogosHero {...normalized} />;
    case "video":
      return <VideoHero {...normalized} />;
    case "cards":
      return <CardsHero {...normalized} />;
    case "aurora":
    default:
      return <AuroraHero {...normalized} />;
  }
}

function AuroraHero(props: NormalizedHeroProps) {
  return (
    <FullWidthSection className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-16 sm:py-20 md:py-24">
      {/* Animated aurora background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-transparent to-violet-500/20 animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.15),transparent_50%)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 sm:gap-10 px-4 sm:px-8 lg:px-16 text-white">
        {props.badge && (
          <span className="w-fit rounded-full border border-white/30 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] shadow-lg shadow-cyan-500/10 transition-all hover:bg-white/10 hover:border-white/40">
            {props.badge}
          </span>
        )}

        <div className="space-y-5 text-left sm:text-center">
          {props.eyebrow && (
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300/90 animate-fade-in">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight bg-gradient-to-r from-white via-white to-cyan-200 bg-clip-text text-transparent">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base sm:text-lg md:text-xl text-slate-200/80 max-w-3xl mx-auto leading-relaxed">
              {props.description}
            </p>
          )}
        </div>

        <ActionsRow
          primary={props.primaryCta}
          secondary={props.secondaryCta}
          className="justify-start sm:justify-center"
        />

        {props.metrics.length > 0 && (
          <dl className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {props.metrics.map((metric, index) => (
              <div
                key={metric.label}
                className="group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 sm:p-6 transition-all duration-300 hover:border-cyan-500/30 hover:bg-white/10 hover:shadow-lg hover:shadow-cyan-500/5"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <dt className="relative text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/80">
                  {metric.label}
                </dt>
                <dd className="relative mt-3 text-2xl sm:text-3xl font-bold text-white">{metric.value}</dd>
                {metric.caption && (
                  <p className="relative mt-2 text-xs text-slate-300/60">{metric.caption}</p>
                )}
              </div>
            ))}
          </dl>
        )}
      </div>
    </FullWidthSection>
  );
}

function SplitHero(props: NormalizedHeroProps) {
  const fallbackImage = props.tenantImageFallback || "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1600&q=80";

  return (
    <FullWidthSection className="relative bg-gradient-to-br from-background via-background to-muted/30 py-12 sm:py-16 md:py-20 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(var(--primary-rgb,99,102,241),0.08),transparent_50%)]" />
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-to-br from-primary/5 to-transparent blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 lg:gap-16 px-4 sm:px-8 lg:flex-row lg:items-center lg:px-12">
        <div className="max-w-xl space-y-5 sm:space-y-6">
          {props.eyebrow && (
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              <span className="h-px w-8 bg-primary/50" />
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">{props.description}</p>
          )}
          {props.highlights.length > 0 && (
            <ul className="space-y-3 pt-2">
              {props.highlights.map((item, index) => (
                <li key={item} className="flex items-start gap-3 group">
                  <span className="mt-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {index + 1}
                  </span>
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="pt-2">
            <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
          </div>
        </div>

        <div className="relative flex-1 lg:flex-none lg:w-1/2">
          <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-secondary/20 blur-2xl opacity-30 rounded-3xl" />
          <HeroImage
            className="relative w-full max-w-xl overflow-hidden rounded-2xl sm:rounded-3xl border border-border/40 shadow-2xl shadow-primary/10 ring-1 ring-white/10"
            image={props.image}
            fallback={fallbackImage}
          />
        </div>
      </div>
    </FullWidthSection>
  );
}

function SpotlightHero(props: NormalizedHeroProps) {
  const fallbackImage = props.tenantImageFallback || "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1600&q=80";

  return (
    <FullWidthSection className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 py-16 sm:py-20 md:py-24 text-white">
      {/* Spotlight effect */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(99,102,241,0.2),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.15),transparent_40%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
      </div>

      <div className="relative mx-auto flex w-full flex-col gap-10 lg:gap-12 px-4 sm:px-8 lg:grid lg:max-w-6xl lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div className="space-y-5 sm:space-y-6">
          {props.badge && (
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs uppercase tracking-[0.3em] transition-all hover:bg-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              {props.badge}
            </span>
          )}
          {props.headline && (
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base sm:text-lg text-slate-200/80 leading-relaxed">{props.description}</p>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />

          {props.metrics.length > 0 && (
            <dl className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 pt-4">
              {props.metrics.map((metric) => (
                <div key={metric.label} className="group rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 sm:p-5 transition-all duration-300 hover:border-indigo-500/30 hover:bg-white/10">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/70">
                    {metric.label}
                  </dt>
                  <dd className="mt-2 text-xl sm:text-2xl font-bold text-white">{metric.value}</dd>
                  {metric.caption && (
                    <p className="mt-1.5 text-xs text-slate-300/60">{metric.caption}</p>
                  )}
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="space-y-5 sm:space-y-6">
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 blur-xl opacity-50 rounded-3xl" />
            <HeroImage
              className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl"
              image={props.image}
              fallback={fallbackImage}
            />
          </div>

          {props.highlights.length > 0 && (
            <ul className="grid gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 sm:p-6 text-sm text-slate-100">
              {props.highlights.map((item, index) => (
                <li key={item} className="flex items-start gap-3 group">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-300 group-hover:bg-indigo-500/30 transition-colors">
                    {(index + 1).toString().padStart(2, "0")}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </FullWidthSection>
  );
}

function PatternHero(props: NormalizedHeroProps) {
  return (
    <FullWidthSection className="relative overflow-hidden bg-background py-12 sm:py-16 md:py-20">
      {/* Pattern background */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(var(--primary-rgb,99,102,241),0.03),transparent)]" />
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(var(--primary-rgb,99,102,241),0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }} />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 lg:gap-12 px-4 sm:px-8 lg:flex-row lg:items-center lg:px-12">
        <div className="max-w-xl space-y-5 sm:space-y-6">
          {props.eyebrow && (
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">{props.description}</p>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </div>

        <div className="flex-1">
          <div className="rounded-2xl sm:rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm p-5 sm:p-8 shadow-xl shadow-primary/5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-primary" />
              Why teams choose StewardTrack
            </p>
            <ul className="mt-5 sm:mt-6 grid gap-3 sm:gap-4 text-sm text-muted-foreground">
              {props.highlights.slice(0, 4).map((item, index) => (
                <li key={item} className="group rounded-xl border border-border/40 bg-background/70 p-4 transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
                  <span className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <span className="pt-0.5">{item}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </FullWidthSection>
  );
}

function StackedHero(props: NormalizedHeroProps) {
  return (
    <FullWidthSection className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-16 sm:py-20 md:py-24 text-slate-100 overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.1),transparent_50%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 sm:gap-10 px-4 sm:px-8 lg:px-16">
        {props.badge && (
          <span className="w-fit rounded-full border border-white/15 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs uppercase tracking-[0.3em] transition-all hover:bg-white/10">
            {props.badge}
          </span>
        )}

        <div className="max-w-4xl space-y-5 sm:space-y-6">
          {props.headline && (
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base sm:text-lg text-slate-300/80 leading-relaxed max-w-3xl">{props.description}</p>
          )}
        </div>

        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />

        {props.metrics.length > 0 && (
          <dl className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 pt-4">
            {props.metrics.map((metric, index) => (
              <div
                key={metric.label}
                className="group rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 sm:p-6 transition-all duration-300 hover:border-white/20 hover:bg-white/10"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/70">
                  {metric.label}
                </dt>
                <dd className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-bold text-white">{metric.value}</dd>
                {metric.caption && <p className="mt-1.5 sm:mt-2 text-xs text-slate-300/60">{metric.caption}</p>}
              </div>
            ))}
          </dl>
        )}
      </div>
    </FullWidthSection>
  );
}

function NewsletterHero(props: NormalizedHeroProps) {
  return (
    <FullWidthSection className="relative bg-gradient-to-br from-background via-background to-muted/20 py-12 sm:py-16 md:py-20 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(var(--primary-rgb,99,102,241),0.08),transparent_50%)]" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 lg:gap-12 px-4 sm:px-8 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="space-y-5 sm:space-y-6">
          {props.badge && (
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-primary shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {props.badge}
            </span>
          )}
          {props.headline && (
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">{props.description}</p>
          )}
          {props.highlights.length > 0 && (
            <ul className="grid gap-3 text-sm text-muted-foreground pt-2">
              {props.highlights.map((item, index) => (
                <li key={item} className="flex items-start gap-3 group">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="relative rounded-2xl sm:rounded-3xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 sm:p-8 shadow-xl shadow-primary/5">
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-2xl sm:rounded-3xl bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_60%)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-primary" />
            Stay in the loop
          </p>
          <p className="mt-3 text-sm text-muted-foreground">{props.form?.disclaimer ?? "Get weekly metadata insights."}</p>
          <form className="mt-5 sm:mt-6 space-y-4" action={typeof props.form?.url === "string" ? String(props.form.url) : undefined}>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-foreground">Email address</span>
              <input
                type="email"
                placeholder={props.form?.placeholder ?? "you@example.com"}
                className="h-11 sm:h-12 w-full rounded-xl border border-border/60 bg-background px-4 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30 hover:border-border"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-11 sm:h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
            >
              {props.form?.buttonLabel ?? "Subscribe"}
            </button>
          </form>
        </div>
      </div>
    </FullWidthSection>
  );
}

function StatsPanelHero(props: NormalizedHeroProps) {
  return (
    <FullWidthSection className="relative bg-gradient-to-br from-background via-background to-muted/20 py-12 sm:py-16 md:py-20 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(var(--primary-rgb,99,102,241),0.06),transparent_50%)]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 lg:gap-12 px-4 sm:px-8 lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="space-y-5 sm:space-y-6">
          {props.eyebrow && (
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              <span className="h-px w-8 bg-primary/50" />
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">{props.description}</p>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
          {props.metrics.map((metric, index) => (
            <div
              key={metric.label}
              className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-5 sm:p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <dt className="relative text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {metric.label}
              </dt>
              <dd className="relative mt-3 sm:mt-4 text-2xl sm:text-3xl font-bold text-foreground">{metric.value}</dd>
              {metric.caption && <p className="relative mt-2 sm:mt-3 text-xs text-muted-foreground/80">{metric.caption}</p>}
            </div>
          ))}
        </div>
      </div>
    </FullWidthSection>
  );
}

function MinimalHero(props: NormalizedHeroProps) {
  const hasImage = Boolean(props.image?.src);
  const altText = props.image?.alt?.trim() ?? "";
  const profileName = React.useMemo(() => {
    if (!altText) {
      return null;
    }

    if (/^.+?'s profile photo$/i.test(altText)) {
      return altText.replace(/'s profile photo$/i, "").trim();
    }

    return altText;
  }, [altText]);

  return (
    <FullWidthSection className="relative bg-gradient-to-br from-background via-background to-muted/10 py-12 sm:py-16 md:py-20 overflow-hidden">
      {/* Subtle decorative element */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(var(--primary-rgb,99,102,241),0.03),transparent_50%)]" />

      <div className="relative mx-auto w-full max-w-4xl space-y-6 px-4 sm:px-6">
        <div
          className={cn(
            "flex flex-col gap-5 sm:gap-6",
            hasImage ? "sm:flex-row sm:items-start sm:justify-between" : ""
          )}
        >
          <div className="space-y-4 sm:space-y-5">
            {props.eyebrow && (
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {props.eyebrow}
              </p>
            )}
            {props.headline && (
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight">
                {props.headline}
              </h1>
            )}
            {props.description && (
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">{props.description}</p>
            )}
          </div>

          {hasImage && (
            <div className="flex w-full max-w-xs items-center gap-4 rounded-xl sm:rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-4 shadow-lg shadow-primary/5 sm:max-w-none sm:self-start transition-all hover:shadow-xl hover:border-border">
              <HeroImage
                className="size-16 sm:size-20 shrink-0 overflow-hidden rounded-full border-2 border-background bg-background shadow-md ring-2 ring-primary/10"
                image={props.image}
                aspect="aspect-square"
              />
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Profile photo</p>
                {profileName && <p className="text-sm font-semibold text-foreground">{profileName}</p>}
                <p className="text-xs text-muted-foreground/80">Displayed across membership records</p>
              </div>
            </div>
          )}
        </div>
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
      </div>
    </FullWidthSection>
  );
}

function TestimonialHero(props: NormalizedHeroProps) {
  return (
    <FullWidthSection className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 py-16 sm:py-20 md:py-24 text-white overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.15),transparent_50%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 lg:gap-12 px-4 sm:px-8 lg:grid lg:grid-cols-[1fr_1fr] lg:items-center">
        <div className="space-y-5 sm:space-y-6">
          {props.badge && (
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs uppercase tracking-[0.3em]">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
              {props.badge}
            </span>
          )}
          {props.headline && (
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base sm:text-lg text-slate-200/80 leading-relaxed">{props.description}</p>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </div>

        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/20 to-indigo-500/20 blur-2xl opacity-50 rounded-3xl" />
          <div className="relative rounded-2xl sm:rounded-3xl border border-white/15 bg-white/5 backdrop-blur-md p-6 sm:p-8 shadow-2xl">
            <span className="text-5xl sm:text-6xl leading-none text-white/20 font-serif">&quot;</span>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-white leading-relaxed">
              {props.testimonial?.quote ?? "StewardTrack lets lifecycle teams craft journeys without waiting on deploys."}
            </p>
            <div className="mt-5 sm:mt-6 space-y-1 text-sm border-t border-white/10 pt-5">
              <p className="font-semibold text-white">{props.testimonial?.author ?? "Jordan Winters"}</p>
              <p className="text-white/60">{props.testimonial?.role ?? "Director of Lifecycle, Acme"}</p>
            </div>
          </div>
        </div>
      </div>
    </FullWidthSection>
  );
}

function LogosHero(props: NormalizedHeroProps) {
  return (
    <FullWidthSection className="relative bg-gradient-to-br from-background via-background to-muted/20 py-12 sm:py-16 md:py-20 overflow-hidden">
      {/* Decorative element */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(var(--primary-rgb,99,102,241),0.05),transparent_50%)]" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 sm:gap-10 px-4 sm:px-8 lg:px-12">
        <div className="max-w-3xl space-y-5 sm:space-y-6">
          {props.headline && (
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">{props.description}</p>
          )}
        </div>
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />

        {props.logos.length > 0 && (
          <div className="rounded-2xl sm:rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm p-5 sm:p-8 shadow-lg shadow-primary/5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-primary" />
              Trusted by modern teams
            </p>
            <div className="mt-5 sm:mt-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {props.logos.map((logo, index) => (
                <div
                  key={logo}
                  className="group flex h-14 sm:h-16 items-center justify-center rounded-xl border border-dashed border-border/40 bg-background/70 px-4 text-sm font-semibold text-muted-foreground transition-all duration-300 hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {logo}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </FullWidthSection>
  );
}

function VideoHero(props: NormalizedHeroProps) {
  const videoLabel = props.video?.label ?? "Watch product tour";
  const fallbackImage = props.video?.thumbnail || props.tenantImageFallback || "https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=1600&q=80";

  return (
    <FullWidthSection className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-16 sm:py-20 md:py-24 text-white overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.1),transparent_60%)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 lg:gap-12 px-4 sm:px-8 lg:grid lg:grid-cols-[1fr_1fr] lg:items-center">
        <div className="space-y-5 sm:space-y-6">
          {props.badge && (
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs uppercase tracking-[0.3em]">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              {props.badge}
            </span>
          )}
          {props.headline && (
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base sm:text-lg text-slate-200/80 leading-relaxed">{props.description}</p>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </div>

        <div className="relative group">
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 blur-2xl opacity-40 rounded-3xl group-hover:opacity-60 transition-opacity" />
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/15 bg-white/5 shadow-2xl">
            <HeroImage
              image={props.image}
              fallback={fallbackImage}
              aspect="aspect-video"
            />
            <a
              href={props.video?.url ?? "#"}
              className="absolute inset-0 m-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-white text-slate-900 shadow-xl transition-all hover:scale-110 hover:shadow-2xl group-hover:scale-105"
            >
              <span className="sr-only">Play video</span>
              <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 fill-current ml-0.5" aria-hidden="true">
                <path d="M5 4.5V15.5L15 10Z" />
              </svg>
            </a>
            <div className="absolute bottom-3 sm:bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/90 backdrop-blur-sm px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-lg">
              {videoLabel}
            </div>
          </div>
        </div>
      </div>
    </FullWidthSection>
  );
}

function CardsHero(props: NormalizedHeroProps) {
  return (
    <FullWidthSection className="relative bg-gradient-to-br from-background via-background to-muted/20 py-12 sm:py-16 md:py-20 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(var(--primary-rgb,99,102,241),0.05),transparent_50%)]" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8 px-4 sm:px-8 lg:px-12">
        <div className="max-w-3xl space-y-5 sm:space-y-6">
          {props.eyebrow && (
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              <span className="h-px w-8 bg-primary/50" />
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">{props.description}</p>
          )}
        </div>
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />

        {props.cards.length > 0 && (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pt-4">
            {props.cards.map((card, index) => (
              <div
                key={card.title}
                className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-5 sm:p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="relative text-sm font-semibold text-primary">{card.title}</p>
                <p className="relative mt-2 sm:mt-3 text-sm text-muted-foreground leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </FullWidthSection>
  );
}

function HeroImage({
  image,
  fallback,
  className,
  aspect,
}: {
  image?: ImageAsset | null;
  fallback?: string;
  className?: string;
  aspect?: string;
}) {
  const src = image?.src ?? fallback;
  if (!src) {
    return null;
  }
  return (
    <figure className={cn(aspect ?? "", className)}>
      <img
        src={src}
        alt={image?.alt ?? "Decorative hero media"}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        loading="lazy"
      />
    </figure>
  );
}

function FullWidthSection({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("relative left-1/2 w-screen -translate-x-1/2", className)}>
      {children}
    </section>
  );
}
