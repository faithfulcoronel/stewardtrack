/* eslint-disable @next/next/no-img-element */
import React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type Metric = {
  label: string;
  value: string;
  caption?: string;
};

type ActionConfig = {
  id?: string;
  kind?: string;
  config?: Record<string, unknown>;
};

type CardItem = {
  title: string;
  description?: string;
  badge?: string;
};

type LinkItem = {
  label: string;
  href?: string;
  description?: string;
  badge?: string;
};

type ContactOption = {
  label: string;
  description?: string;
  href?: string;
};

type StepItem = {
  title: string;
  description?: string;
};

type ImageAsset = {
  src?: string;
  alt?: string;
};

type CtaVariant =
  | "gradient"
  | "split"
  | "minimal"
  | "stats"
  | "cards"
  | "overlay"
  | "newsletter"
  | "tiered"
  | "sidebar"
  | "floating"
  | "pill"
  | "support";

export interface CtaSectionProps {
  eyebrow?: string;
  badge?: string;
  headline?: string;
  description?: string;
  highlight?: string;
  variant?: CtaVariant;
  metrics?: Metric[] | { items?: Metric[] } | null;
  highlights?: string[] | { items?: string[] } | null;
  cards?: CardItem[] | { items?: CardItem[] } | null;
  links?: LinkItem[] | { items?: LinkItem[] } | null;
  contacts?: ContactOption[] | { items?: ContactOption[] } | null;
  steps?: StepItem[] | { items?: StepItem[] } | null;
  logos?: string[] | { items?: string[] } | null;
  primaryCta?: ActionConfig | null;
  secondaryCta?: ActionConfig | null;
  form?: {
    placeholder?: string;
    buttonLabel?: string;
    disclaimer?: string;
    url?: string;
  } | null;
  media?: ImageAsset | null;
  children?: React.ReactNode;
}

interface NormalizedCtaProps
  extends Omit<
    CtaSectionProps,
    "metrics" | "highlights" | "cards" | "links" | "contacts" | "steps" | "logos"
  > {
  metrics: Metric[];
  highlights: string[];
  cards: CardItem[];
  links: LinkItem[];
  contacts: ContactOption[];
  steps: StepItem[];
  logos: string[];
}

export function CtaSection(props: CtaSectionProps) {
  const normalized: NormalizedCtaProps = {
    ...props,
    metrics: normalizeList<Metric>(props.metrics),
    highlights: normalizeList<string>(props.highlights),
    cards: normalizeList<CardItem>(props.cards),
    links: normalizeList<LinkItem>(props.links),
    contacts: normalizeList<ContactOption>(props.contacts),
    steps: normalizeList<StepItem>(props.steps),
    logos: normalizeList<string>(props.logos),
  };

  switch (normalized.variant ?? "gradient") {
    case "split":
      return <SplitCta {...normalized} />;
    case "minimal":
      return <MinimalCta {...normalized} />;
    case "stats":
      return <StatsCta {...normalized} />;
    case "cards":
      return <CardsCta {...normalized} />;
    case "overlay":
      return <OverlayCta {...normalized} />;
    case "newsletter":
      return <NewsletterCta {...normalized} />;
    case "tiered":
      return <TieredCta {...normalized} />;
    case "sidebar":
      return <SidebarCta {...normalized} />;
    case "floating":
      return <FloatingCta {...normalized} />;
    case "pill":
      return <PillCta {...normalized} />;
    case "support":
      return <SupportCta {...normalized} />;
    case "gradient":
    default:
      return <GradientCta {...normalized} />;
  }
}

function GradientCta(props: NormalizedCtaProps) {
  return (
    <FullWidthSection className="relative isolate overflow-hidden bg-slate-950 py-20 text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.35),_transparent_60%)]" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900/90 to-slate-950" />
      </div>
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 sm:px-8">
        <div className="space-y-4 text-left sm:text-center">
          {props.badge && (
            <span className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em]">
              {props.badge}
            </span>
          )}
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200/90">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
              {props.headline}
            </h2>
          )}
          {props.description && (
            <p className="text-base text-slate-100/80 sm:text-lg">
              {props.description}
            </p>
          )}
        </div>
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} className="justify-start sm:justify-center" />
        {props.metrics.length > 0 && (
          <dl className="grid gap-4 sm:grid-cols-3">
            {props.metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-3xl border border-white/20 bg-white/10 p-6 text-left backdrop-blur"
              >
                <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-100/80">
                  {metric.label}
                </dt>
                <dd className="mt-2 text-2xl font-semibold text-white">{metric.value}</dd>
                {metric.caption && <p className="mt-2 text-xs text-slate-200/70">{metric.caption}</p>}
              </div>
            ))}
          </dl>
        )}
      </div>
    </FullWidthSection>
  );
}

function SplitCta(props: NormalizedCtaProps) {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 sm:px-8 lg:grid-cols-[1.05fr_minmax(0,0.95fr)] lg:px-12">
        <div className="space-y-6">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">{props.eyebrow}</p>
          )}
          {props.headline && (
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">{props.headline}</h2>
          )}
          {props.description && (
            <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
          )}
          {props.highlights.length > 0 && (
            <ul className="space-y-3 text-sm text-muted-foreground">
              {props.highlights.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold uppercase tracking-widest text-primary">
                    •
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-muted/40 shadow-xl">
          {props.media?.src ? (
            <img
              src={props.media.src}
              alt={props.media.alt ?? "Workflow illustration"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full min-h-[320px] w-full items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/20 p-10 text-center text-sm text-muted-foreground">
              <p>Drop in a workflow screenshot or illustration to accompany this CTA.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MinimalCta(props: NormalizedCtaProps) {
  return (
    <section className="bg-muted/30 py-16">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 text-center sm:px-6">
        {props.eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">{props.eyebrow}</p>
        )}
        {props.headline && (
          <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">{props.headline}</h2>
        )}
        {props.description && (
          <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
        )}
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} className="justify-center" />
        {props.links.length > 0 && (
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            {props.links.map((link) => (
              <Link
                key={link.label}
                href={link.href ?? "#"}
                className="group inline-flex items-start gap-3 rounded-2xl border border-border/60 bg-background px-4 py-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="mt-1 inline-flex size-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold uppercase tracking-[0.25em] text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                  →
                </span>
                <span>
                  <span className="block font-semibold text-foreground">{link.label}</span>
                  {link.description && <span className="text-xs text-muted-foreground/90">{link.description}</span>}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function StatsCta(props: NormalizedCtaProps) {
  return (
    <section className="bg-background py-24">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 sm:px-8 lg:grid-cols-[1.15fr_minmax(0,0.85fr)] lg:px-12">
        <div className="space-y-6">
          {props.badge && (
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary">
              {props.badge}
            </span>
          )}
          {props.headline && (
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">{props.headline}</h2>
          )}
          {props.description && (
            <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
          )}
          {props.highlight && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">Headline metric</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{props.highlight}</p>
            </div>
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
        {props.metrics.length > 0 && (
          <dl className="grid gap-4">
            {props.metrics.map((metric) => (
              <div key={metric.label} className="rounded-3xl border border-border/60 bg-muted/40 p-6 text-left">
                <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">
                  {metric.label}
                </dt>
                <dd className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</dd>
                {metric.caption && <p className="mt-2 text-xs text-muted-foreground/80">{metric.caption}</p>}
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

function CardsCta(props: NormalizedCtaProps) {
  return (
    <section className="bg-muted/20 py-20">
      <div className="mx-auto w-full max-w-6xl space-y-10 px-4 sm:px-8">
        <div className="space-y-4 text-left sm:text-center">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">{props.eyebrow}</p>
          )}
          {props.headline && (
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">{props.headline}</h2>
          )}
          {props.description && (
            <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
          )}
        </div>
        {props.cards.length > 0 && (
          <div className="grid gap-6 md:grid-cols-3">
            {props.cards.map((card) => (
              <div key={card.title} className="flex h-full flex-col gap-3 rounded-3xl border border-border/60 bg-background p-6 shadow-sm">
                {card.badge && (
                  <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-primary">
                    {card.badge}
                  </span>
                )}
                <h3 className="text-xl font-semibold text-foreground">{card.title}</h3>
                {card.description && <p className="text-sm text-muted-foreground">{card.description}</p>}
              </div>
            ))}
          </div>
        )}
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} className="justify-start sm:justify-center" />
        {props.links.length > 0 && (
          <div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
            {props.links.map((link) => (
              <Link
                key={link.label}
                href={link.href ?? "#"}
                className="group flex flex-col rounded-2xl border border-border/60 bg-background/60 p-5 transition hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-foreground">{link.label}</span>
                  <span className="inline-flex size-8 items-center justify-center rounded-full border border-border/60 text-sm transition group-hover:border-primary group-hover:text-primary">
                    ↗
                  </span>
                </div>
                {link.badge && (
                  <span className="mt-2 inline-flex w-fit items-center rounded-full bg-primary/10 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-primary">
                    {link.badge}
                  </span>
                )}
                {link.description && <p className="mt-2 text-xs text-muted-foreground/80">{link.description}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function OverlayCta(props: NormalizedCtaProps) {
  const background =
    props.media?.src ??
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80";

  return (
    <FullWidthSection className="relative isolate overflow-hidden py-24 text-white">
      <div className="absolute inset-0">
        <img src={background} alt={props.media?.alt ?? "Event audience"} className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-slate-950/80" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-slate-950/70 to-slate-950" />
      </div>
      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-4 text-center sm:px-6">
        {props.eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">{props.eyebrow}</p>
        )}
        {props.headline && (
          <h2 className="text-3xl font-semibold sm:text-4xl">{props.headline}</h2>
        )}
        {props.description && (
          <p className="text-base text-slate-100/80 sm:text-lg">{props.description}</p>
        )}
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} className="justify-center" />
      </div>
    </FullWidthSection>
  );
}

function NewsletterCta(props: NormalizedCtaProps) {
  return (
    <section className="bg-background py-24">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-border/50 bg-background/80 shadow-xl backdrop-blur">
        <div className="grid gap-10 px-6 py-10 sm:px-12 md:grid-cols-[1.3fr_minmax(0,0.9fr)]">
          <div className="space-y-6">
            {props.eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">{props.eyebrow}</p>
            )}
            {props.headline && (
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">{props.headline}</h2>
            )}
            {props.description && (
              <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
            )}
            <form
              className="space-y-4"
              action={typeof props.form?.url === "string" ? String(props.form.url) : undefined}
              method="post"
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="flex-1">
                  <span className="sr-only">Email address</span>
                  <input
                    type="email"
                    required
                    placeholder={props.form?.placeholder ?? "you@example.com"}
                    className="h-12 w-full rounded-full border border-border/60 bg-background px-5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  {props.form?.buttonLabel ?? "Subscribe"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {props.form?.disclaimer ?? "No spam—just actionable GTM blueprints."}
              </p>
            </form>
            <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
          </div>
          <div className="space-y-5 rounded-3xl border border-border/50 bg-muted/40 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground/80">
              What subscribers receive
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {props.highlights.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex size-2 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function TieredCta(props: NormalizedCtaProps) {
  return (
    <section className="bg-muted/10 py-20">
      <div className="mx-auto w-full max-w-6xl space-y-10 px-4 sm:px-8 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            {props.badge && (
              <span className="inline-flex w-fit items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-primary">
                {props.badge}
              </span>
            )}
            {props.eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">{props.eyebrow}</p>
            )}
            {props.headline && (
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">{props.headline}</h2>
            )}
            {props.description && (
              <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
            )}
            {props.metrics.length > 0 && (
              <dl className="grid gap-4 sm:grid-cols-2">
                {props.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-border/60 bg-background p-5">
                    <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">
                      {metric.label}
                    </dt>
                    <dd className="mt-2 text-xl font-semibold text-foreground">{metric.value}</dd>
                    {metric.caption && <p className="mt-2 text-xs text-muted-foreground/80">{metric.caption}</p>}
                  </div>
                ))}
              </dl>
            )}
            <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
          </div>
          <div className="grid gap-4">
            {props.links.map((link) => (
              <Link
                key={link.label}
                href={link.href ?? "#"}
                className="group flex flex-col gap-2 rounded-3xl border border-border/60 bg-background p-6 transition hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{link.label}</p>
                    {link.description && <p className="text-sm text-muted-foreground">{link.description}</p>}
                  </div>
                  <span className="inline-flex size-9 items-center justify-center rounded-full border border-border/60 text-sm transition group-hover:border-primary group-hover:text-primary">
                    →
                  </span>
                </div>
                {link.badge && (
                  <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-primary">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SidebarCta(props: NormalizedCtaProps) {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-8 lg:px-12">
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-background/90 shadow-xl">
          <div className="grid gap-10 px-6 py-10 sm:px-12 md:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)]">
            <div className="space-y-6">
              {props.eyebrow && (
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">{props.eyebrow}</p>
              )}
              {props.headline && (
                <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">{props.headline}</h2>
              )}
              {props.description && (
                <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
              )}
              {props.highlights.length > 0 && (
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {props.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1 inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold uppercase tracking-widest text-primary">
                        ✓
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
            </div>
            <div className="space-y-4 rounded-3xl border border-border/60 bg-muted/40 p-6">
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">
                Connect with us
              </h3>
              <ul className="space-y-3">
                {props.contacts.map((contact) => (
                  <li key={contact.label}>
                    <Link
                      href={contact.href ?? "#"}
                      className="group flex flex-col gap-1 rounded-2xl border border-border/40 bg-background/80 p-4 transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <span className="text-sm font-semibold text-foreground group-hover:text-primary">
                        {contact.label}
                      </span>
                      {contact.description && (
                        <span className="text-xs text-muted-foreground/80">{contact.description}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FloatingCta(props: NormalizedCtaProps) {
  return (
    <FullWidthSection className="relative isolate overflow-hidden bg-slate-950 py-24 text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(14,165,233,0.15),_transparent_55%)]" />
        <div className="absolute inset-0 bg-slate-950/95" />
      </div>
      <div className="relative mx-auto w-full max-w-6xl space-y-10 px-4 sm:px-8">
        <div className="max-w-3xl space-y-4">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200/80">{props.eyebrow}</p>
          )}
          {props.headline && (
            <h2 className="text-3xl font-semibold sm:text-4xl">{props.headline}</h2>
          )}
          {props.description && (
            <p className="text-base text-slate-100/80 sm:text-lg">{props.description}</p>
          )}
        </div>
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {props.steps.map((step, index) => (
            <div
              key={step.title}
              className="flex h-full flex-col gap-3 rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-base font-semibold">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg font-semibold text-white">{step.title}</h3>
              {step.description && <p className="text-sm text-slate-100/80">{step.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </FullWidthSection>
  );
}

function PillCta(props: NormalizedCtaProps) {
  return (
    <section className="bg-background py-16">
      <div className="mx-auto w-full max-w-4xl space-y-8 px-4 text-center sm:px-6">
        {props.badge && (
          <span className="inline-flex items-center justify-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-primary">
            {props.badge}
          </span>
        )}
        {props.eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">{props.eyebrow}</p>
        )}
        {props.headline && (
          <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">{props.headline}</h2>
        )}
        {props.description && (
          <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
        )}
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} className="justify-center" />
        {props.highlights.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {props.highlights.map((item) => (
              <span
                key={item}
                className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-4 py-2 text-sm font-medium text-muted-foreground"
              >
                {item}
              </span>
            ))}
          </div>
        )}
        {props.logos.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground/70">
            {props.logos.map((logo) => (
              <span key={logo}>{logo}</span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SupportCta(props: NormalizedCtaProps) {
  return (
    <section className="bg-muted/30 py-20">
      <div className="mx-auto w-full max-w-5xl space-y-8 px-4 sm:px-8">
        {props.eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">{props.eyebrow}</p>
        )}
        {props.headline && (
          <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">{props.headline}</h2>
        )}
        {props.description && (
          <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
        )}
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        {props.contacts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {props.contacts.map((contact) => (
              <Link
                key={contact.label}
                href={contact.href ?? "#"}
                className="group flex h-full flex-col gap-2 rounded-3xl border border-border/60 bg-background p-6 transition hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="text-base font-semibold text-foreground group-hover:text-primary">
                  {contact.label}
                </span>
                {contact.description && (
                  <span className="text-sm text-muted-foreground">{contact.description}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ActionsRow({
  primary,
  secondary,
  className,
}: {
  primary?: ActionConfig | null;
  secondary?: ActionConfig | null;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-4", className)}>
      {renderAction(primary, "primary")}
      {renderAction(secondary, "ghost")}
    </div>
  );
}

function renderAction(action: ActionConfig | null | undefined, fallbackVariant: string) {
  if (!action) {
    return null;
  }
  const config = action.config ?? {};
  const href = typeof config.url === "string" ? config.url : "#";
  const label = typeof config.label === "string" ? config.label : "Learn more";
  const variant = typeof config.variant === "string" ? config.variant : fallbackVariant;
  return (
    <Link
      key={action.id ?? label}
      href={href}
      className={cn(
        "inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        buttonStyles(variant)
      )}
    >
      {label}
    </Link>
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

function buttonStyles(variant: string) {
  switch (variant) {
    case "ghost":
      return "bg-transparent text-foreground ring-offset-background hover:bg-muted/60 focus-visible:ring-muted";
    case "secondary":
      return "bg-background text-foreground border border-border/60 hover:bg-muted/60 focus-visible:ring-primary/40";
    case "primary":
    default:
      return "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/40";
  }
}

function normalizeList<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (value && typeof value === "object" && "items" in (value as Record<string, unknown>)) {
    const items = (value as { items?: unknown }).items;
    return Array.isArray(items) ? (items as T[]) : [];
  }
  if (typeof value === "string") {
    return [value as unknown as T];
  }
  return [];
}
