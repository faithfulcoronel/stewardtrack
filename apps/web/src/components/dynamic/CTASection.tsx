/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import React from "react";

import { cn } from "@/lib/utils";
import { normalizeList, renderAction, type ActionConfig } from "./shared";

type CTAStat = {
  label: string;
  value: string;
  caption?: string;
};

type CTAHighlightItem = {
  title: string;
  description?: string;
};

type CTAStep = {
  title: string;
  description?: string;
};

type ContactMethod = {
  label: string;
  value?: string;
  url?: string;
  description?: string;
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

type EventDetails = {
  date?: string;
  time?: string;
  timezone?: string;
  location?: string;
};

type ResourceDetails = {
  label?: string;
  meta?: string;
};

type CTASectionVariant =
  | "split"
  | "metrics"
  | "banner"
  | "stacked"
  | "showcase"
  | "event"
  | "newsletter"
  | "testimonial"
  | "resource"
  | "contact"
  | "minimal"
  | "grid";

export interface CTASectionProps {
  eyebrow?: string;
  headline?: string;
  description?: string;
  badge?: string;
  highlight?: string;
  variant?: CTASectionVariant;
  primaryCta?: ActionConfig | null;
  secondaryCta?: ActionConfig | null;
  tertiaryCta?: ActionConfig | null;
  image?: ImageAsset | null;
  stats?: CTAStat[] | { items?: CTAStat[] } | null;
  checklist?: string[] | { items?: string[] } | null;
  highlights?: CTAHighlightItem[] | { items?: CTAHighlightItem[] } | null;
  steps?: CTAStep[] | { items?: CTAStep[] } | null;
  contactMethods?: ContactMethod[] | { items?: ContactMethod[] } | null;
  logos?: string[] | { items?: string[] } | null;
  testimonial?: Testimonial | null;
  event?: EventDetails | null;
  resource?: ResourceDetails | null;
  form?: {
    placeholder?: string;
    buttonLabel?: string;
    disclaimer?: string;
    url?: string;
  } | null;
  children?: React.ReactNode;
}

interface NormalizedCTAProps
  extends Omit<
    CTASectionProps,
    "stats" | "checklist" | "highlights" | "steps" | "contactMethods" | "logos"
  > {
  stats: CTAStat[];
  checklist: string[];
  highlights: CTAHighlightItem[];
  steps: CTAStep[];
  contactMethods: ContactMethod[];
  logos: string[];
}

export function CTASection(props: CTASectionProps) {
  const normalized: NormalizedCTAProps = {
    ...props,
    stats: normalizeList<CTAStat>(props.stats),
    checklist: normalizeList<string>(props.checklist),
    highlights: normalizeList<CTAHighlightItem>(props.highlights),
    steps: normalizeList<CTAStep>(props.steps),
    contactMethods: normalizeList<ContactMethod>(props.contactMethods),
    logos: normalizeList<string>(props.logos),
  };

  switch (normalized.variant ?? "split") {
    case "metrics":
      return <MetricsCTA {...normalized} />;
    case "banner":
      return <BannerCTA {...normalized} />;
    case "stacked":
      return <StackedCTA {...normalized} />;
    case "showcase":
      return <ShowcaseCTA {...normalized} />;
    case "event":
      return <EventCTA {...normalized} />;
    case "newsletter":
      return <NewsletterCTA {...normalized} />;
    case "testimonial":
      return <TestimonialCTA {...normalized} />;
    case "resource":
      return <ResourceCTA {...normalized} />;
    case "contact":
      return <ContactCTA {...normalized} />;
    case "minimal":
      return <MinimalCTA {...normalized} />;
    case "grid":
      return <GridCTA {...normalized} />;
    case "split":
    default:
      return <SplitCTA {...normalized} />;
  }
}

function SplitCTA(props: NormalizedCTAProps) {
  return (
    <FullWidthSection className="bg-background py-18 sm:py-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-8 lg:flex-row lg:items-center lg:gap-16 lg:px-12">
        <div className="max-w-xl space-y-6">
          {props.badge && (
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              {props.badge}
            </span>
          )}
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl md:text-5xl">
              {props.headline}
            </h2>
          )}
          {props.description && <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>}
          {props.checklist.length > 0 && (
            <ul className="space-y-3 text-sm text-muted-foreground">
              {props.checklist.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex size-2 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          <CTAActions
            primary={props.primaryCta}
            secondary={props.secondaryCta}
            tertiary={props.tertiaryCta}
            className="pt-2"
          />
        </div>
        <div className="w-full max-w-md">
          {props.image?.src ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border/60 bg-muted/40 shadow-sm">
              <img
                src={props.image.src}
                alt={props.image.alt ?? "Call-to-action illustration"}
                className="size-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            props.children ?? null
          )}
        </div>
      </div>
    </FullWidthSection>
  );
}

function MetricsCTA(props: NormalizedCTAProps) {
  return (
    <FullWidthSection className="relative overflow-hidden bg-slate-950 py-20 text-slate-100">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-slate-900 to-slate-950" />
        <div className="absolute inset-y-0 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 sm:px-8">
        <div className="space-y-4">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-3xl font-semibold sm:text-4xl md:text-5xl">{props.headline}</h2>
          )}
          {props.description && <p className="text-base text-slate-200/80 sm:text-lg">{props.description}</p>}
          {props.highlight && (
            <p className="text-2xl font-semibold text-primary sm:text-3xl">{props.highlight}</p>
          )}
        </div>
        <CTAActions
          primary={props.primaryCta}
          secondary={props.secondaryCta}
          tertiary={props.tertiaryCta}
        />
        {props.stats.length > 0 && (
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {props.stats.map((stat) => (
              <div key={`${stat.label}-${stat.value}`} className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur">
                <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200/80">
                  {stat.label}
                </dt>
                <dd className="mt-3 text-3xl font-semibold text-white">{stat.value}</dd>
                {stat.caption && <p className="mt-2 text-xs text-slate-200/70">{stat.caption}</p>}
              </div>
            ))}
          </dl>
        )}
      </div>
    </FullWidthSection>
  );
}

function BannerCTA(props: NormalizedCTAProps) {
  return (
    <FullWidthSection className="py-12">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shadow-sm">
        <div className="flex flex-col gap-6 px-6 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            {props.badge && (
              <span className="inline-flex items-center rounded-full bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                {props.badge}
              </span>
            )}
            {props.headline && (
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">{props.headline}</h2>
            )}
            {props.description && <p className="text-sm text-muted-foreground sm:text-base">{props.description}</p>}
            {props.highlight && (
              <p className="text-lg font-semibold text-primary sm:text-xl">{props.highlight}</p>
            )}
          </div>
          <CTAActions
            primary={props.primaryCta}
            secondary={props.secondaryCta}
            tertiary={props.tertiaryCta}
            className="lg:justify-end"
          />
        </div>
      </div>
    </FullWidthSection>
  );
}

function StackedCTA(props: NormalizedCTAProps) {
  return (
    <FullWidthSection className="bg-muted/40 py-18 sm:py-24">
      <div className="mx-auto w-full max-w-6xl space-y-12 px-4 sm:px-8 lg:px-12">
        <div className="max-w-2xl space-y-5">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">{props.headline}</h2>
          )}
          {props.description && <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>}
          <CTAActions
            primary={props.primaryCta}
            secondary={props.secondaryCta}
            tertiary={props.tertiaryCta}
            className="pt-2"
          />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {props.highlights.length > 0
            ? props.highlights.map((item) => (
                <div key={item.title} className="rounded-3xl border border-border/70 bg-background p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                  {item.description && (
                    <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                  )}
                </div>
              ))
            : props.checklist.map((item) => (
                <div key={item} className="rounded-3xl border border-border/70 bg-background p-6 shadow-sm">
                  <p className="text-sm text-muted-foreground">{item}</p>
                </div>
              ))}
        </div>
      </div>
    </FullWidthSection>
  );
}

function ShowcaseCTA(props: NormalizedCTAProps) {
  return (
    <FullWidthSection className="bg-background py-18 sm:py-24">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:px-12">
        <div className="space-y-6">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">{props.headline}</h2>
          )}
          {props.description && <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>}
          {props.highlight && (
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary/70">
              {props.highlight}
            </p>
          )}
          <CTAActions
            primary={props.primaryCta}
            secondary={props.secondaryCta}
            tertiary={props.tertiaryCta}
          />
          {props.children}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {props.highlights.map((item) => (
            <div key={item.title} className="rounded-3xl border border-border/60 bg-muted/40 p-6">
              <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
              {item.description && (
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </FullWidthSection>
  );
}

function EventCTA(props: NormalizedCTAProps) {
  return (
    <FullWidthSection className="bg-slate-950 py-20 text-slate-100">
      <div className="mx-auto w-full max-w-4xl space-y-8 px-4 text-center sm:px-8">
        {props.badge && (
          <span className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
            {props.badge}
          </span>
        )}
        {props.headline && (
          <h2 className="text-3xl font-semibold sm:text-4xl md:text-5xl">{props.headline}</h2>
        )}
        {props.description && (
          <p className="text-base text-slate-200/80 sm:text-lg">{props.description}</p>
        )}
        {props.event && (
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-200/80">
            {props.event.date && (
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                <p className="font-semibold uppercase tracking-[0.2em]">Date</p>
                <p className="mt-1 text-base text-white">{props.event.date}</p>
              </div>
            )}
            {props.event.time && (
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                <p className="font-semibold uppercase tracking-[0.2em]">Time</p>
                <p className="mt-1 text-base text-white">
                  {props.event.time}
                  {props.event.timezone ? ` ${props.event.timezone}` : ""}
                </p>
              </div>
            )}
            {props.event.location && (
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                <p className="font-semibold uppercase tracking-[0.2em]">Location</p>
                <p className="mt-1 text-base text-white">{props.event.location}</p>
              </div>
            )}
          </div>
        )}
        <CTAActions
          primary={props.primaryCta}
          secondary={props.secondaryCta}
          tertiary={props.tertiaryCta}
          className="justify-center"
        />
      </div>
    </FullWidthSection>
  );
}

function NewsletterCTA(props: NormalizedCTAProps) {
  return (
    <FullWidthSection className="bg-background py-18 sm:py-24">
      <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 sm:px-8 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {props.badge && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              {props.badge}
            </span>
          )}
          {props.headline && (
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">{props.headline}</h2>
          )}
          {props.description && <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>}
          {props.highlights.length > 0 && (
            <ul className="space-y-3 text-sm text-muted-foreground">
              {props.highlights.map((item, index) => (
                <li key={item.title ?? `${index}-${item.description ?? "highlight"}`} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex size-2 rounded-full bg-primary" />
                  <span>
                    <span className="block font-semibold text-foreground">
                      {item.title}
                    </span>
                    {item.description && <span className="text-muted-foreground">{item.description}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <CTAActions
            primary={props.primaryCta}
            secondary={props.secondaryCta}
            tertiary={props.tertiaryCta}
          />
        </div>
        <div className="rounded-3xl border border-border/70 bg-muted/40 p-6">
          <p className="text-sm text-muted-foreground">
            {props.form?.disclaimer ?? "Join thousands of operators learning about schema-driven content."}
          </p>
          <form
            className="mt-6 space-y-4"
            action={typeof props.form?.url === "string" ? String(props.form.url) : undefined}
          >
            <input
              type="email"
              name="email"
              required
              placeholder={props.form?.placeholder ?? "you@example.com"}
              className="w-full rounded-full border border-border/60 bg-background px-5 py-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="submit"
              className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            >
              {props.form?.buttonLabel ?? "Subscribe"}
            </button>
          </form>
        </div>
      </div>
    </FullWidthSection>
  );
}

function TestimonialCTA(props: NormalizedCTAProps) {
  return (
    <FullWidthSection className="bg-muted/30 py-18 sm:py-24">
      <div className="mx-auto w-full max-w-4xl space-y-8 px-4 text-center sm:px-8">
        {props.badge && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            {props.badge}
          </span>
        )}
        {props.headline && (
          <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">{props.headline}</h2>
        )}
        {props.description && <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>}
        {props.testimonial?.quote && (
          <blockquote className="text-xl font-medium leading-relaxed text-foreground sm:text-2xl">
            “{props.testimonial.quote}”
          </blockquote>
        )}
        {(props.testimonial?.author || props.testimonial?.role) && (
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            {props.testimonial?.author}
            {props.testimonial?.role ? ` · ${props.testimonial.role}` : ""}
          </p>
        )}
        <CTAActions
          primary={props.primaryCta}
          secondary={props.secondaryCta}
          tertiary={props.tertiaryCta}
          className="justify-center"
        />
      </div>
    </FullWidthSection>
  );
}

function ResourceCTA(props: NormalizedCTAProps) {
  return (
    <FullWidthSection className="bg-background py-18 sm:py-24">
      <div className="mx-auto w-full max-w-5xl rounded-3xl border border-dashed border-border/60 bg-muted/20 px-6 py-10 shadow-sm sm:px-12">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            {props.eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                {props.eyebrow}
              </p>
            )}
            {props.headline && (
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">{props.headline}</h2>
            )}
            {props.description && <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>}
            {props.resource && (
              <div className="rounded-2xl border border-border/60 bg-background p-4">
                {props.resource.label && (
                  <p className="text-sm font-semibold text-foreground">{props.resource.label}</p>
                )}
                {props.resource.meta && (
                  <p className="text-xs text-muted-foreground">{props.resource.meta}</p>
                )}
              </div>
            )}
            <CTAActions
              primary={props.primaryCta}
              secondary={props.secondaryCta}
              tertiary={props.tertiaryCta}
            />
          </div>
          <div className="space-y-4">
            {props.steps.length > 0 && (
              <ol className="space-y-4 text-sm text-muted-foreground">
                {props.steps.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">{step.title}</p>
                      {step.description && <p className="text-muted-foreground">{step.description}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </FullWidthSection>
  );
}

function ContactCTA(props: NormalizedCTAProps) {
  return (
    <FullWidthSection className="bg-slate-950 py-20 text-slate-100">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 sm:px-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:px-12">
        <div className="space-y-5">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-3xl font-semibold sm:text-4xl md:text-5xl">{props.headline}</h2>
          )}
          {props.description && (
            <p className="text-base text-slate-200/80 sm:text-lg">{props.description}</p>
          )}
          <CTAActions
            primary={props.primaryCta}
            secondary={props.secondaryCta}
            tertiary={props.tertiaryCta}
          />
        </div>
        <div className="grid gap-4">
          {props.contactMethods.map((method) => (
            <div key={method.label} className="rounded-3xl border border-white/20 bg-white/10 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
                {method.label}
              </p>
              {method.value && <p className="mt-1 text-lg font-semibold text-white">{method.value}</p>}
              {method.description && (
                <p className="text-xs text-slate-200/70">{method.description}</p>
              )}
              {method.url && (
                <Link
                  href={method.url}
                  className="mt-3 inline-flex items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Contact this channel
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </FullWidthSection>
  );
}

function MinimalCTA(props: NormalizedCTAProps) {
  return (
    <FullWidthSection className="py-16">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 text-center sm:px-8">
        {props.badge && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            {props.badge}
          </span>
        )}
        {props.headline && (
          <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">{props.headline}</h2>
        )}
        {props.description && <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>}
        <CTAActions
          primary={props.primaryCta}
          secondary={props.secondaryCta}
          tertiary={props.tertiaryCta}
          className="justify-center"
        />
      </div>
    </FullWidthSection>
  );
}

function GridCTA(props: NormalizedCTAProps) {
  return (
    <FullWidthSection className="bg-background py-18 sm:py-24">
      <div className="mx-auto w-full max-w-6xl space-y-10 px-4 sm:px-8 lg:px-12">
        <div className="max-w-3xl space-y-5">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">{props.headline}</h2>
          )}
          {props.description && <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>}
        </div>
        {props.logos.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {props.logos.map((logo) => (
              <div
                key={logo}
                className="flex h-24 items-center justify-center rounded-3xl border border-border/60 bg-muted/30 px-6 text-sm font-semibold text-muted-foreground"
              >
                {logo}
              </div>
            ))}
          </div>
        )}
        {props.checklist.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {props.checklist.map((item) => (
              <li key={item} className="rounded-3xl border border-border/60 bg-background p-4 text-sm text-muted-foreground">
                {item}
              </li>
            ))}
          </ul>
        )}
        <CTAActions
          primary={props.primaryCta}
          secondary={props.secondaryCta}
          tertiary={props.tertiaryCta}
        />
      </div>
    </FullWidthSection>
  );
}

function CTAActions({
  primary,
  secondary,
  tertiary,
  className,
}: {
  primary?: ActionConfig | null;
  secondary?: ActionConfig | null;
  tertiary?: ActionConfig | null;
  className?: string;
}) {
  const nodes = [
    renderAction(primary ?? null, "primary"),
    renderAction(secondary ?? null, "ghost"),
    renderAction(tertiary ?? null, "ghost"),
  ].filter(Boolean);

  if (nodes.length === 0) {
    return null;
  }

  return <div className={cn("flex flex-wrap items-center gap-3", className)}>{nodes}</div>;
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
