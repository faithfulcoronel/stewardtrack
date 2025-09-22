/* eslint-disable @next/next/no-img-element */
import React from "react";

import { cn } from "@/lib/utils";
import {
  ActionsRow,
  buttonStyles,
  normalizeList,
  type ActionConfig,
} from "./shared";

type NewsletterStat = {
  label: string;
  value: string;
  caption?: string;
};

type NewsletterHighlight = {
  title: string;
  description?: string;
};

type NewsletterCard = {
  title: string;
  description?: string;
  badge?: string;
};

type NewsletterStep = {
  title: string;
  description?: string;
};

type NewsletterTestimonial = {
  quote?: string;
  author?: string;
  role?: string;
};

type ImageAsset = {
  src?: string;
  alt?: string;
};

type EventDetails = {
  date?: string;
  time?: string;
  timezone?: string;
  location?: string;
};

type NewsletterVariant =
  | "split"
  | "stacked"
  | "minimal"
  | "magazine"
  | "digest"
  | "stats"
  | "event"
  | "community"
  | "product"
  | "resource"
  | "gallery"
  | "spotlight";

export interface NewsletterSectionProps {
  eyebrow?: string;
  headline?: string;
  description?: string;
  highlight?: string;
  badge?: string;
  variant?: NewsletterVariant;
  primaryCta?: ActionConfig | null;
  secondaryCta?: ActionConfig | null;
  tertiaryCta?: ActionConfig | null;
  stats?: NewsletterStat[] | { items?: NewsletterStat[] } | null;
  checklist?: string[] | { items?: string[] } | null;
  highlights?: NewsletterHighlight[] | { items?: NewsletterHighlight[] } | null;
  cards?: NewsletterCard[] | { items?: NewsletterCard[] } | null;
  steps?: NewsletterStep[] | { items?: NewsletterStep[] } | null;
  logos?: string[] | { items?: string[] } | null;
  testimonials?: NewsletterTestimonial[] | { items?: NewsletterTestimonial[] } | null;
  gallery?: ImageAsset[] | { items?: ImageAsset[] } | null;
  image?: ImageAsset | null;
  event?: EventDetails | null;
  form?: {
    placeholder?: string;
    buttonLabel?: string;
    disclaimer?: string;
    url?: string;
  } | null;
  children?: React.ReactNode;
}

interface NormalizedNewsletterProps
  extends Omit<
    NewsletterSectionProps,
    | "stats"
    | "checklist"
    | "highlights"
    | "cards"
    | "steps"
    | "logos"
    | "testimonials"
    | "gallery"
  > {
  stats: NewsletterStat[];
  checklist: string[];
  highlights: NewsletterHighlight[];
  cards: NewsletterCard[];
  steps: NewsletterStep[];
  logos: string[];
  testimonials: NewsletterTestimonial[];
  gallery: ImageAsset[];
}

export function NewsletterSection(props: NewsletterSectionProps) {
  const normalized: NormalizedNewsletterProps = {
    ...props,
    stats: normalizeList<NewsletterStat>(props.stats),
    checklist: normalizeList<string>(props.checklist),
    highlights: normalizeList<NewsletterHighlight>(props.highlights),
    cards: normalizeList<NewsletterCard>(props.cards),
    steps: normalizeList<NewsletterStep>(props.steps),
    logos: normalizeList<string>(props.logos),
    testimonials: normalizeList<NewsletterTestimonial>(props.testimonials),
    gallery: normalizeList<ImageAsset>(props.gallery),
  };

  switch (normalized.variant ?? "split") {
    case "stacked":
      return <StackedNewsletter {...normalized} />;
    case "minimal":
      return <MinimalNewsletter {...normalized} />;
    case "magazine":
      return <MagazineNewsletter {...normalized} />;
    case "digest":
      return <DigestNewsletter {...normalized} />;
    case "stats":
      return <StatsNewsletter {...normalized} />;
    case "event":
      return <EventNewsletter {...normalized} />;
    case "community":
      return <CommunityNewsletter {...normalized} />;
    case "product":
      return <ProductNewsletter {...normalized} />;
    case "resource":
      return <ResourceNewsletter {...normalized} />;
    case "gallery":
      return <GalleryNewsletter {...normalized} />;
    case "spotlight":
      return <SpotlightNewsletter {...normalized} />;
    case "split":
    default:
      return <SplitNewsletter {...normalized} />;
  }
}

function SplitNewsletter(props: NormalizedNewsletterProps) {
  return (
    <FullWidthSection className="bg-background py-18 sm:py-24">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
        <div className="space-y-6">
          {props.badge && (
            <span className="inline-flex w-fit items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
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
          {props.description && (
            <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
          )}
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
          <ActionsRow
            primary={props.primaryCta}
            secondary={props.secondaryCta}
            className="pt-2"
          />
          {props.logos.length > 0 && (
            <div className="flex flex-wrap items-center gap-6 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/70">
              {props.logos.map((logo) => (
                <span key={logo}>{logo}</span>
              ))}
            </div>
          )}
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-muted/40 p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_60%)]" />
          {props.image?.src && (
            <div className="mb-6 overflow-hidden rounded-2xl border border-border/60">
              <img
                src={props.image.src}
                alt={props.image.alt ?? "Newsletter preview"}
                className="h-40 w-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            {props.highlight ?? "Plan your growth sprints with a weekly briefing."}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {props.form?.disclaimer ?? "We send one actionable briefing every Tuesday at 9am."}
          </p>
          <NewsletterSignupForm form={props.form} className="mt-6" />
        </div>
      </div>
    </FullWidthSection>
  );
}

function StackedNewsletter(props: NormalizedNewsletterProps) {
  return (
    <FullWidthSection className="relative overflow-hidden bg-slate-950 py-20 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_55%)]" />
      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center gap-8 px-4 text-center sm:px-8">
        {props.badge && (
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]">
            {props.badge}
          </span>
        )}
        {props.headline && (
          <h2 className="text-4xl font-semibold leading-tight sm:text-5xl">
            {props.headline}
          </h2>
        )}
        {props.description && (
          <p className="text-base text-slate-200/80 sm:text-lg">{props.description}</p>
        )}
        <NewsletterSignupForm
          form={props.form}
          layout="inline"
          className="w-full max-w-xl"
          inputVariant="dark"
        />
        {props.form?.disclaimer && (
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300/70">
            {props.form.disclaimer}
          </p>
        )}
        {props.highlights.length > 0 && (
          <div className="grid w-full gap-4 sm:grid-cols-2">
            {props.highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-200/80">
                  {item.title}
                </p>
                {item.description && (
                  <p className="mt-3 text-sm text-slate-200/70">{item.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
        {props.logos.length > 0 && (
          <div className="flex flex-wrap justify-center gap-6 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300/70">
            {props.logos.map((logo) => (
              <span key={logo}>{logo}</span>
            ))}
          </div>
        )}
      </div>
    </FullWidthSection>
  );
}

function MinimalNewsletter(props: NormalizedNewsletterProps) {
  return (
    <FullWidthSection className="bg-background py-16 sm:py-20">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 text-center sm:px-8">
        {props.eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            {props.eyebrow}
          </p>
        )}
        {props.headline && (
          <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
            {props.headline}
          </h2>
        )}
        {props.description && (
          <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
        )}
        <NewsletterSignupForm form={props.form} layout="inline" className="w-full" />
        {props.form?.disclaimer && (
          <p className="text-xs text-muted-foreground">{props.form.disclaimer}</p>
        )}
        {props.checklist.length > 0 && (
          <ul className="grid w-full gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            {props.checklist.map((item) => (
              <li key={item} className="flex items-center justify-center gap-2">
                <span className="inline-flex size-2 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </FullWidthSection>
  );
}

function MagazineNewsletter(props: NormalizedNewsletterProps) {
  return (
    <FullWidthSection className="bg-muted/40 py-18 sm:py-24">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="space-y-6">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
              {props.headline}
            </h2>
          )}
          {props.description && (
            <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
          )}
          <NewsletterSignupForm form={props.form} className="max-w-md" />
          {props.form?.disclaimer && (
            <p className="text-xs text-muted-foreground">{props.form.disclaimer}</p>
          )}
          {props.highlights.length > 0 && (
            <div className="grid gap-3 text-sm text-muted-foreground">
              {props.highlights.map((item) => (
                <div key={item.title} className="rounded-2xl border border-border/60 bg-background/80 p-4">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  {item.description && (
                    <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {props.cards.length > 0 ? (
            props.cards.map((card) => (
              <article
                key={card.title}
                className="flex h-full flex-col justify-between rounded-3xl border border-border/60 bg-background p-6 shadow-sm"
              >
                <div className="space-y-3">
                  {card.badge && (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                      {card.badge}
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-foreground">{card.title}</h3>
                  {card.description && (
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                  )}
                </div>
                <div className="pt-6 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Featured story
                </div>
              </article>
            ))
          ) : (
            props.children ?? null
          )}
        </div>
      </div>
    </FullWidthSection>
  );
}

function DigestNewsletter(props: NormalizedNewsletterProps) {
  return (
    <FullWidthSection className="bg-background py-18 sm:py-24">
      <div className="mx-auto grid w-full max-w-5xl gap-12 px-4 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          {props.badge && (
            <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              {props.badge}
            </span>
          )}
          {props.headline && (
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
              {props.headline}
            </h2>
          )}
          {props.description && (
            <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
          )}
          {props.steps.length > 0 && (
            <ol className="space-y-4">
              {props.steps.map((step, index) => (
                <li key={step.title} className="flex items-start gap-4">
                  <span className="mt-1 inline-flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                      {step.title}
                    </p>
                    {step.description && (
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-border/60 bg-muted/40 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Weekly cadence</p>
            {props.stats.length > 0 && (
              <dl className="mt-4 grid gap-3">
                {props.stats.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-border/50 bg-background/80 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                      {metric.label}
                    </dt>
                    <dd className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</dd>
                    {metric.caption && (
                      <p className="mt-2 text-xs text-muted-foreground">{metric.caption}</p>
                    )}
                  </div>
                ))}
              </dl>
            )}
          </div>
          <div className="rounded-3xl border border-border/60 bg-muted/40 p-6">
            <p className="text-sm font-semibold text-foreground">
              Never miss the Monday briefing
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {props.form?.disclaimer ?? "Highlights land in your inbox every Monday at 8am."}
            </p>
            <NewsletterSignupForm form={props.form} className="mt-4" />
          </div>
        </div>
      </div>
    </FullWidthSection>
  );
}

function StatsNewsletter(props: NormalizedNewsletterProps) {
  return (
    <FullWidthSection className="relative overflow-hidden bg-primary py-20 text-primary-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_55%)]" />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-8 px-4 text-center sm:px-8">
        {props.eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-foreground/70">
            {props.eyebrow}
          </p>
        )}
        {props.headline && (
          <h2 className="text-4xl font-semibold sm:text-5xl">{props.headline}</h2>
        )}
        {props.description && (
          <p className="text-base text-primary-foreground/80 sm:text-lg">{props.description}</p>
        )}
        {props.stats.length > 0 && (
          <dl className="grid w-full gap-4 sm:grid-cols-3">
            {props.stats.map((metric) => (
              <div key={metric.label} className="rounded-3xl border border-white/30 bg-white/10 p-6">
                <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-foreground/80">
                  {metric.label}
                </dt>
                <dd className="mt-3 text-3xl font-semibold">{metric.value}</dd>
                {metric.caption && (
                  <p className="mt-2 text-xs text-primary-foreground/70">{metric.caption}</p>
                )}
              </div>
            ))}
          </dl>
        )}
        <NewsletterSignupForm
          form={props.form}
          layout="inline"
          className="w-full max-w-xl"
          buttonVariant="secondary"
          inputVariant="dark"
        />
        <ActionsRow
          primary={props.primaryCta}
          secondary={props.secondaryCta}
          className="justify-center"
        />
      </div>
    </FullWidthSection>
  );
}

function EventNewsletter(props: NormalizedNewsletterProps) {
  const event = props.event ?? {};
  return (
    <FullWidthSection className="bg-background py-18 sm:py-24">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="space-y-6">
            {props.badge && (
              <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                {props.badge}
              </span>
            )}
            {props.headline && (
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
                {props.headline}
              </h2>
            )}
            {props.description && (
              <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
            )}
            <div className="rounded-3xl border border-border/60 bg-muted/40 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Upcoming live session
              </p>
              <dl className="mt-4 grid gap-3 text-sm text-muted-foreground">
                {event.date && (
                  <div className="flex items-center justify-between">
                    <dt className="uppercase tracking-[0.3em]">Date</dt>
                    <dd className="font-semibold text-foreground">{event.date}</dd>
                  </div>
                )}
                {event.time && (
                  <div className="flex items-center justify-between">
                    <dt className="uppercase tracking-[0.3em]">Time</dt>
                    <dd className="font-semibold text-foreground">
                      {event.time}
                      {event.timezone ? ` ${event.timezone}` : ""}
                    </dd>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center justify-between">
                    <dt className="uppercase tracking-[0.3em]">Location</dt>
                    <dd className="font-semibold text-foreground">{event.location}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-3xl border border-border/60 bg-muted/40 p-6">
              <p className="text-sm font-semibold text-foreground">Reserve your seat</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {props.form?.disclaimer ?? "Subscribers get the calendar invite and on-demand replay."}
              </p>
              <NewsletterSignupForm form={props.form} className="mt-4" />
              <ActionsRow
                primary={props.primaryCta}
                secondary={props.secondaryCta}
                className="mt-4"
              />
            </div>
            {props.steps.length > 0 && (
              <div className="rounded-3xl border border-border/60 bg-muted/40 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Session agenda
                </p>
                <ul className="mt-4 space-y-4">
                  {props.steps.map((step) => (
                    <li key={step.title} className="rounded-2xl border border-border/50 bg-background/80 p-4">
                      <p className="text-sm font-semibold text-foreground">{step.title}</p>
                      {step.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </FullWidthSection>
  );
}

function CommunityNewsletter(props: NormalizedNewsletterProps) {
  const testimonial = props.testimonials.at(0);
  return (
    <FullWidthSection className="bg-muted/30 py-18 sm:py-24">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-6">
          {props.badge && (
            <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              {props.badge}
            </span>
          )}
          {props.headline && (
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
              {props.headline}
            </h2>
          )}
          {props.description && (
            <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
          )}
          {props.highlights.length > 0 && (
            <ul className="space-y-3 text-sm text-muted-foreground">
              {props.highlights.map((item) => (
                <li key={item.title} className="rounded-2xl border border-border/60 bg-background/80 p-4">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  {item.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <NewsletterSignupForm form={props.form} className="max-w-md" />
          {testimonial && testimonial.quote && (
            <blockquote className="rounded-3xl border border-border/60 bg-background/80 p-6 text-sm text-muted-foreground">
              <p>“{testimonial.quote}”</p>
              {(testimonial.author || testimonial.role) && (
                <footer className="mt-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">
                  {[testimonial.author, testimonial.role].filter(Boolean).join(" — ")}
                </footer>
              )}
            </blockquote>
          )}
        </div>
        <div className="flex h-full flex-col justify-between gap-6">
          {props.gallery.length > 0 && <AvatarGallery images={props.gallery} />}
          <div className="rounded-3xl border border-border/60 bg-background/80 p-6 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Trusted by peers across 40+ communities</p>
            <p className="mt-2">
              {props.highlight ?? "Join the conversation and share how you experiment with metadata."}
            </p>
          </div>
        </div>
      </div>
    </FullWidthSection>
  );
}

function ProductNewsletter(props: NormalizedNewsletterProps) {
  return (
    <FullWidthSection className="bg-background py-18 sm:py-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-8">
        <div className="space-y-6 text-center">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
              {props.headline}
            </h2>
          )}
          {props.description && (
            <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
              {props.description}
            </p>
          )}
          <NewsletterSignupForm
            form={props.form}
            layout="inline"
            className="mx-auto w-full max-w-2xl"
          />
          {props.form?.disclaimer && (
            <p className="text-xs text-muted-foreground">{props.form.disclaimer}</p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {props.cards.length > 0 ? (
            props.cards.map((card) => (
              <div
                key={card.title}
                className="flex h-full flex-col justify-between rounded-3xl border border-border/60 bg-muted/40 p-6"
              >
                <div className="space-y-3">
                  {card.badge && (
                    <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                      {card.badge}
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-foreground">{card.title}</h3>
                  {card.description && (
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                  )}
                </div>
                <span className="pt-6 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Release highlight
                </span>
              </div>
            ))
          ) : (
            props.children ?? null
          )}
        </div>
        {props.stats.length > 0 && (
          <dl className="grid gap-4 text-center sm:grid-cols-3">
            {props.stats.map((metric) => (
              <div key={metric.label} className="rounded-3xl border border-border/60 bg-muted/40 p-6">
                <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  {metric.label}
                </dt>
                <dd className="mt-3 text-3xl font-semibold text-foreground">{metric.value}</dd>
                {metric.caption && (
                  <p className="mt-2 text-xs text-muted-foreground">{metric.caption}</p>
                )}
              </div>
            ))}
          </dl>
        )}
      </div>
    </FullWidthSection>
  );
}

function ResourceNewsletter(props: NormalizedNewsletterProps) {
  return (
    <FullWidthSection className="relative overflow-hidden bg-slate-950 py-20 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_60%)]" />
      <div className="relative mx-auto grid w-full max-w-5xl gap-10 px-4 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="space-y-6">
          {props.badge && (
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]">
              {props.badge}
            </span>
          )}
          {props.headline && (
            <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">
              {props.headline}
            </h2>
          )}
          {props.description && (
            <p className="text-base text-slate-200/80 sm:text-lg">{props.description}</p>
          )}
          {props.checklist.length > 0 && (
            <ul className="space-y-3 text-sm text-slate-200/80">
              {props.checklist.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary-foreground">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-4 rounded-3xl border border-white/15 bg-white/5 p-6">
            <p className="text-sm font-semibold text-white">Unlock the resource kit</p>
            <NewsletterSignupForm
              form={props.form}
              inputVariant="dark"
              buttonVariant="primary"
            />
            {props.form?.disclaimer && (
              <p className="text-xs uppercase tracking-[0.3em] text-slate-200/70">
                {props.form.disclaimer}
              </p>
            )}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {props.cards.length > 0 &&
            props.cards.map((card) => (
              <div key={card.title} className="rounded-3xl border border-white/10 bg-white/10 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200/70">
                  {card.badge ?? "Guide"}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-white">{card.title}</h3>
                {card.description && (
                  <p className="mt-2 text-sm text-slate-200/80">{card.description}</p>
                )}
              </div>
            ))}
        </div>
      </div>
    </FullWidthSection>
  );
}

function GalleryNewsletter(props: NormalizedNewsletterProps) {
  return (
    <FullWidthSection className="bg-background py-18 sm:py-24">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div className="space-y-6">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
              {props.headline}
            </h2>
          )}
          {props.description && (
            <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
          )}
          <NewsletterSignupForm form={props.form} className="max-w-md" />
          {props.form?.disclaimer && (
            <p className="text-xs text-muted-foreground">{props.form.disclaimer}</p>
          )}
          {props.highlights.length > 0 && (
            <div className="space-y-3 text-sm text-muted-foreground">
              {props.highlights.map((item) => (
                <div key={item.title} className="rounded-2xl border border-border/60 bg-muted/40 p-4">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  {item.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {props.gallery.length > 0 ? (
            props.gallery.map((image, index) => (
              <div
                key={`${image.src ?? "placeholder"}-${index}`}
                className="group relative overflow-hidden rounded-3xl border border-border/60 bg-muted/40"
              >
                {image.src ? (
                  <img
                    src={image.src}
                    alt={image.alt ?? "Newsletter gallery image"}
                    className="h-48 w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                    Upcoming feature
                  </div>
                )}
              </div>
            ))
          ) : (
            props.children ?? null
          )}
        </div>
      </div>
    </FullWidthSection>
  );
}

function SpotlightNewsletter(props: NormalizedNewsletterProps) {
  const testimonial = props.testimonials.at(0);
  return (
    <FullWidthSection className="bg-muted/40 py-20">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8 px-4 text-center sm:px-8">
        {props.badge && (
          <span className="inline-flex items-center rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            {props.badge}
          </span>
        )}
        {props.headline && (
          <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
            {props.headline}
          </h2>
        )}
        {props.description && (
          <p className="text-base text-muted-foreground sm:text-lg">{props.description}</p>
        )}
        {testimonial?.quote && (
          <blockquote className="space-y-4 text-balance text-lg text-muted-foreground">
            <p>“{testimonial.quote}”</p>
            {(testimonial.author || testimonial.role) && (
              <footer className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/70">
                {[testimonial.author, testimonial.role].filter(Boolean).join(" — ")}
              </footer>
            )}
          </blockquote>
        )}
        <NewsletterSignupForm form={props.form} layout="inline" className="w-full" />
        <div className="flex flex-wrap justify-center gap-4 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          {props.logos.length > 0
            ? props.logos.map((logo) => <span key={logo}>{logo}</span>)
            : null}
        </div>
      </div>
    </FullWidthSection>
  );
}

function NewsletterSignupForm({
  form,
  layout = "stacked",
  className,
  buttonVariant = "primary",
  inputVariant = "light",
  buttonFullWidth,
}: {
  form?: NewsletterSectionProps["form"] | null;
  layout?: "stacked" | "inline";
  className?: string;
  buttonVariant?: "primary" | "secondary" | "ghost";
  inputVariant?: "light" | "dark";
  buttonFullWidth?: boolean;
}) {
  const inputId = React.useId();
  const action = typeof form?.url === "string" ? String(form.url) : undefined;
  const placeholder = form?.placeholder ?? "you@example.com";
  const label = form?.buttonLabel ?? "Subscribe";
  const formClass =
    layout === "inline"
      ? "flex flex-col gap-3 sm:flex-row sm:items-center"
      : "space-y-4";
  const inputClasses = cn(
    "h-11 w-full rounded-full border px-4 text-sm transition focus:outline-none focus-visible:ring-2",
    inputVariant === "dark"
      ? "border-white/20 bg-white/10 text-white placeholder:text-slate-300/60 focus-visible:ring-white/40"
      : "border-border/60 bg-background text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-primary/30"
  );
  const buttonClasses = cn(
    "inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold transition",
    buttonStyles(buttonVariant),
    layout === "inline" && !buttonFullWidth ? "sm:w-auto" : "w-full"
  );

  return (
    <form action={action} className={cn(formClass, className)}>
      <label className="sr-only" htmlFor={inputId}>
        Email address
      </label>
      <input
        id={inputId}
        name="email"
        type="email"
        required
        placeholder={placeholder}
        className={inputClasses}
      />
      <button type="submit" className={buttonClasses}>
        {label}
      </button>
    </form>
  );
}

function AvatarGallery({ images }: { images: ImageAsset[] }) {
  if (images.length === 0) {
    return null;
  }
  return (
    <div className="grid grid-cols-4 gap-3">
      {images.slice(0, 8).map((image, index) => (
        <div
          key={`${image.src ?? "avatar"}-${index}`}
          className="aspect-square overflow-hidden rounded-full border border-border/60 bg-muted/40"
        >
          {image.src ? (
            <img
              src={image.src}
              alt={image.alt ?? "Community member"}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
              +
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FullWidthSection({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <section className={cn("w-full", className)}>{children}</section>;
}
