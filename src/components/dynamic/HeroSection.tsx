/* eslint-disable @next/next/no-img-element */
import React from "react";

import { cn } from "@/lib/utils";
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
}

export function HeroSection(props: HeroSectionProps) {
  const normalized: NormalizedHeroProps = {
    ...props,
    metrics: normalizeList<Metric>(props.metrics),
    logos: normalizeList<string>(props.logos),
    highlights: normalizeList<string>(props.highlights),
    cards: normalizeList<CardItem>(props.cards),
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
    <FullWidthSection className="relative overflow-hidden bg-slate-950 py-20">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/30 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]" />
      </div>
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 text-white sm:px-8 lg:px-16">
        {props.badge && (
          <span className="w-fit rounded-full border border-white/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]">
            {props.badge}
          </span>
        )}
        <div className="space-y-6 text-left sm:text-center">
          {props.eyebrow && (
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200/90">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base text-slate-100/80 sm:text-lg md:text-xl">
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
          <dl className="grid gap-6 sm:grid-cols-3">
            {props.metrics.map((metric) => (
              <div key={metric.label} className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur">
                <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200/80">
                  {metric.label}
                </dt>
                <dd className="mt-3 text-3xl font-semibold text-white">{metric.value}</dd>
                {metric.caption && (
                  <p className="mt-2 text-xs text-slate-200/70">{metric.caption}</p>
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
  return (
    <FullWidthSection className="bg-background py-18 sm:py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-8 lg:flex-row lg:items-center lg:px-12">
        <div className="max-w-xl space-y-6">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>
          )}
          {props.headline && (
            <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
          )}
          {props.highlights.length > 0 && (
            <ul className="space-y-3 text-sm text-muted-foreground">
              {props.highlights.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex size-2 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </div>
        <HeroImage
          className="w-full max-w-xl overflow-hidden rounded-3xl border border-border/60 shadow-2xl"
          image={props.image}
          fallback="https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1600&q=80"
        />
      </div>
    </FullWidthSection>
  );
}

function SpotlightHero(props: NormalizedHeroProps) {
  return (
    <FullWidthSection className="relative overflow-hidden bg-slate-900 py-20 text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(99,102,241,0.25),transparent)]" />
      </div>
      <div className="relative mx-auto flex w-full flex-col gap-12 px-4 sm:px-8 lg:grid lg:max-w-6xl lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div className="space-y-6">
          {props.badge && (
            <span className="inline-flex w-fit items-center rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em]">
              {props.badge}
            </span>
          )}
          {props.headline && (
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base text-slate-200 sm:text-lg">{props.description}</p>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
          {props.metrics.length > 0 && (
            <dl className="grid gap-4 sm:grid-cols-2">
              {props.metrics.map((metric) => (
                <div key={metric.label} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200/80">
                    {metric.label}
                  </dt>
                  <dd className="mt-3 text-2xl font-semibold text-white">{metric.value}</dd>
                  {metric.caption && (
                    <p className="mt-2 text-xs text-slate-200/70">{metric.caption}</p>
                  )}
                </div>
              ))}
            </dl>
          )}
        </div>
        <div className="space-y-6">
          <HeroImage
            className="overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
            image={props.image}
            fallback="https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1600&q=80"
          />
          {props.highlights.length > 0 && (
            <ul className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-100 backdrop-blur">
              {props.highlights.map((item, index) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex size-6 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
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
    <FullWidthSection className="relative overflow-hidden bg-background py-18 sm:py-20">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.06),transparent)]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-8 lg:flex-row lg:items-center lg:px-12">
        <div className="max-w-xl space-y-6">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>
          )}
          {props.headline && (
            <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </div>
        <div className="w-full rounded-3xl border border-border/60 bg-muted/40 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Why teams choose StewardTrack
          </p>
          <ul className="mt-6 grid gap-4 text-sm text-muted-foreground">
            {props.highlights.slice(0, 4).map((item) => (
              <li key={item} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </FullWidthSection>
  );
}

function StackedHero(props: NormalizedHeroProps) {
  return (
    <FullWidthSection className="bg-slate-950 py-20 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-8 lg:px-16">
        {props.badge && (
          <span className="w-fit rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.3em]">
            {props.badge}
          </span>
        )}
        <div className="max-w-4xl space-y-6">
          {props.headline && (
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base text-slate-300 sm:text-lg">{props.description}</p>
          )}
        </div>
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        {props.metrics.length > 0 && (
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {props.metrics.map((metric) => (
              <div key={metric.label} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200/70">
                  {metric.label}
                </dt>
                <dd className="mt-3 text-3xl font-semibold text-white">{metric.value}</dd>
                {metric.caption && <p className="mt-2 text-xs text-slate-200/60">{metric.caption}</p>}
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
    <FullWidthSection className="bg-background py-18 sm:py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-8 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="space-y-6">
          {props.badge && (
            <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              {props.badge}
            </span>
          )}
          {props.headline && (
            <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
          )}
          {props.highlights.length > 0 && (
            <ul className="grid gap-3 text-sm text-muted-foreground">
              {props.highlights.map((item, index) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex size-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="relative rounded-3xl border border-border/60 bg-muted/40 p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_60%)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Stay in the loop</p>
          <p className="mt-3 text-sm text-muted-foreground">{props.form?.disclaimer ?? "Get weekly metadata insights."}</p>
          <form className="mt-6 space-y-4" action={typeof props.form?.url === "string" ? String(props.form.url) : undefined}>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-foreground">Email address</span>
              <input
                type="email"
                placeholder={props.form?.placeholder ?? "you@example.com"}
                className="h-11 w-full rounded-full border border-border/60 bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
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
    <FullWidthSection className="bg-background py-18 sm:py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-8 lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="space-y-6">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>
          )}
          {props.headline && (
            <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {props.metrics.map((metric) => (
            <div key={metric.label} className="rounded-3xl border border-border/60 bg-muted/40 p-6">
              <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                {metric.label}
              </dt>
              <dd className="mt-4 text-3xl font-semibold text-foreground">{metric.value}</dd>
              {metric.caption && <p className="mt-3 text-xs text-muted-foreground">{metric.caption}</p>}
            </div>
          ))}
        </div>
      </div>
    </FullWidthSection>
  );
}

function MinimalHero(props: NormalizedHeroProps) {
  return (
    <FullWidthSection className="bg-background py-18 sm:py-20">
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 sm:px-6">
        {props.eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>
        )}
        {props.headline && (
          <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">
            {props.headline}
          </h1>
        )}
        {props.description && (
          <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
        )}
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
      </div>
    </FullWidthSection>
  );
}

function TestimonialHero(props: NormalizedHeroProps) {
  return (
    <FullWidthSection className="bg-slate-950 py-20 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-8 lg:grid lg:grid-cols-[1fr_1fr] lg:items-center">
        <div className="space-y-6">
          {props.badge && (
            <span className="inline-flex w-fit items-center rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em]">
              {props.badge}
            </span>
          )}
          {props.headline && (
            <h1 className="text-4xl font-semibold sm:text-5xl">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base text-slate-200 sm:text-lg">{props.description}</p>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </div>
        <div className="relative rounded-3xl border border-white/15 bg-white/5 p-8 shadow-2xl">
          <span className="text-6xl leading-none text-white/20">&quot;</span>
          <p className="mt-6 text-lg text-white">
            {props.testimonial?.quote ?? "StewardTrack lets lifecycle teams craft journeys without waiting on deploys."}
          </p>
          <div className="mt-6 space-y-1 text-sm">
            <p className="font-semibold text-white">{props.testimonial?.author ?? "Jordan Winters"}</p>
            <p className="text-white/70">{props.testimonial?.role ?? "Director of Lifecycle, Acme"}</p>
          </div>
        </div>
      </div>
    </FullWidthSection>
  );
}

function LogosHero(props: NormalizedHeroProps) {
  return (
    <FullWidthSection className="bg-background py-18 sm:py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-8 lg:px-12">
        <div className="max-w-3xl space-y-6">
          {props.headline && (
            <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
          )}
        </div>
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        {props.logos.length > 0 && (
          <div className="rounded-3xl border border-border/60 bg-muted/30 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Trusted by modern teams</p>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {props.logos.map((logo) => (
                <div
                  key={logo}
                  className="flex h-16 items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/80 px-4 text-sm font-semibold text-muted-foreground"
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
  return (
    <FullWidthSection className="bg-slate-950 py-20 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-8 lg:grid lg:grid-cols-[1fr_1fr] lg:items-center">
        <div className="space-y-6">
          {props.badge && (
            <span className="inline-flex w-fit items-center rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em]">
              {props.badge}
            </span>
          )}
          {props.headline && (
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base text-slate-200 sm:text-lg">{props.description}</p>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/5 shadow-2xl">
          <HeroImage
            image={props.image}
            fallback={props.video?.thumbnail ?? "https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=1600&q=80"}
            aspect="aspect-video"
          />
          <a
            href={props.video?.url ?? "#"}
            className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-900 shadow-xl transition hover:scale-105"
          >
            <span className="sr-only">Play video</span>
            <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 fill-current" aria-hidden="true">
              <path d="M5 4.5V15.5L15 10Z" />
            </svg>
          </a>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/90 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-900">
            {videoLabel}
          </div>
        </div>
      </div>
    </FullWidthSection>
  );
}

function CardsHero(props: NormalizedHeroProps) {
  return (
    <FullWidthSection className="bg-background py-18 sm:py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-8 lg:px-12">
        <div className="max-w-3xl space-y-6">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>
          )}
          {props.headline && (
            <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
          )}
        </div>
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        {props.cards.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {props.cards.map((card) => (
              <div key={card.title} className="rounded-3xl border border-border/60 bg-muted/30 p-6">
                <p className="text-sm font-semibold text-primary">{card.title}</p>
                <p className="mt-3 text-sm text-muted-foreground">{card.description}</p>
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
        className="h-full w-full object-cover"
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
