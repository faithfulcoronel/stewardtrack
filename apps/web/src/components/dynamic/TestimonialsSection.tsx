import React from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { ActionsRow, normalizeList, type ActionConfig } from "./shared";

export type TestimonialsVariant =
  | "spotlight-carousel"
  | "grid-mosaic"
  | "split-story"
  | "centered-minimal"
  | "offset-accent"
  | "brand-panel"
  | "patterned-columns"
  | "timeline-reel"
  | "bubble-stack"
  | "photo-panels"
  | "magazine-layout"
  | "stat-highlight";

export type Testimonial = {
  quote: string;
  author: string;
  role?: string;
  company?: string;
  avatarUrl?: string;
  imageUrl?: string;
  imageAlt?: string;
  rating?: number;
  highlight?: string;
  metricValue?: string;
  metricLabel?: string;
  industry?: string;
  location?: string;
  logoUrl?: string;
};

export interface TestimonialsSectionProps {
  eyebrow?: string;
  headline?: string;
  description?: string;
  variant?: TestimonialsVariant;
  testimonials?: Testimonial[] | { items?: Testimonial[] } | null;
  logos?: string[] | { items?: string[] } | null;
  highlights?: string[] | { items?: string[] } | null;
  footnote?: string;
  primaryCta?: ActionConfig | null;
  secondaryCta?: ActionConfig | null;
  children?: React.ReactNode;
}

interface NormalizedTestimonialsProps
  extends Omit<TestimonialsSectionProps, "testimonials" | "logos" | "highlights"> {
  testimonials: Testimonial[];
  logos: string[];
  highlights: string[];
  primaryCta: ActionConfig | null;
  secondaryCta: ActionConfig | null;
}

export function TestimonialsSection(props: TestimonialsSectionProps) {
  const normalized: NormalizedTestimonialsProps = {
    ...props,
    testimonials: normalizeList<Testimonial>(props.testimonials),
    logos: normalizeList<string>(props.logos),
    highlights: normalizeList<string>(props.highlights),
    primaryCta: props.primaryCta ?? null,
    secondaryCta: props.secondaryCta ?? null,
  };

  switch (normalized.variant ?? "spotlight-carousel") {
    case "grid-mosaic":
      return <GridMosaicTestimonials {...normalized} />;
    case "split-story":
      return <SplitStoryTestimonials {...normalized} />;
    case "centered-minimal":
      return <CenteredMinimalTestimonials {...normalized} />;
    case "offset-accent":
      return <OffsetAccentTestimonials {...normalized} />;
    case "brand-panel":
      return <BrandPanelTestimonials {...normalized} />;
    case "patterned-columns":
      return <PatternedColumnsTestimonials {...normalized} />;
    case "timeline-reel":
      return <TimelineReelTestimonials {...normalized} />;
    case "bubble-stack":
      return <BubbleStackTestimonials {...normalized} />;
    case "photo-panels":
      return <PhotoPanelsTestimonials {...normalized} />;
    case "magazine-layout":
      return <MagazineLayoutTestimonials {...normalized} />;
    case "stat-highlight":
      return <StatHighlightTestimonials {...normalized} />;
    case "spotlight-carousel":
    default:
      return <SpotlightCarouselTestimonials {...normalized} />;
  }
}

function SpotlightCarouselTestimonials(props: NormalizedTestimonialsProps) {
  const [primary, ...rest] = props.testimonials;

  if (!primary) {
    return null;
  }

  return (
    <FullWidthSection className="relative overflow-hidden bg-slate-950 py-20 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-slate-900 to-slate-950" />
        <div className="absolute -left-24 top-0 size-[360px] rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -right-16 bottom-0 size-[420px] rounded-full bg-indigo-500/25 blur-3xl" />
      </div>
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-8">
        <header className="space-y-5 text-center">
          {props.logos.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 text-xs uppercase tracking-[0.35em] text-slate-200/60">
              {props.logos.map((logo) => (
                <span
                  key={logo}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2"
                >
                  <span className="inline-flex size-1.5 rounded-full bg-white/60" />
                  {logo}
                </span>
              ))}
            </div>
          )}
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary/80">{props.eyebrow}</p>
          )}
          {props.headline && <h2 className="text-4xl font-semibold sm:text-5xl">{props.headline}</h2>}
          {props.description && (
            <p className="mx-auto max-w-3xl text-base text-slate-300/80">{props.description}</p>
          )}
          <ActionsRow
            primary={props.primaryCta}
            secondary={props.secondaryCta}
            className="justify-center text-slate-100"
          />
        </header>
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/5 p-8 shadow-2xl">
            {primary.imageUrl && (
              <Image
                fill
                src={primary.imageUrl}
                alt={primary.imageAlt ?? primary.author}
                className="absolute inset-0 object-cover opacity-20"
                sizes="(min-width: 1024px) 50vw, 100vw"
                loading="lazy"
              />
            )}
            <div className="relative space-y-6">
              {primary.rating && (
                <div className="flex items-center gap-2 text-sm text-amber-300">
                  <span className="text-base">{renderStars(primary.rating)}</span>
                  <span className="text-xs uppercase tracking-[0.3em] text-amber-200/80">
                    {primary.rating.toFixed(1)} rating
                  </span>
                </div>
              )}
              <blockquote className="text-left text-xl leading-relaxed text-slate-100">
                “{primary.quote}”
              </blockquote>
              <div className="flex items-center gap-4">
                {primary.avatarUrl && (
                  <Image
                    src={primary.avatarUrl}
                    alt={primary.author}
                    width={56}
                    height={56}
                    className="size-14 rounded-full border border-white/40 object-cover"
                    loading="lazy"
                  />
                )}
                <div>
                  <p className="text-base font-semibold text-white">{primary.author}</p>
                  <p className="text-sm text-slate-200/80">
                    {[primary.role, primary.company].filter(Boolean).join(" · ")}
                  </p>
                  {primary.highlight && (
                    <p className="mt-2 text-xs uppercase tracking-[0.3em] text-primary/80">
                      {primary.highlight}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </article>
          <div className="grid gap-6">
            {rest.map((item) => (
              <article
                key={`${item.author}-${item.company ?? ""}`}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:bg-white/10"
              >
                {item.imageUrl && (
                  <Image
                    fill
                    src={item.imageUrl}
                    alt={item.imageAlt ?? item.author}
                    className="absolute inset-0 object-cover opacity-10"
                    sizes="(min-width: 1024px) 25vw, 100vw"
                    loading="lazy"
                  />
                )}
                <div className="relative space-y-4 text-left">
                  <blockquote className="text-sm leading-relaxed text-slate-100/90">
                    “{item.quote}”
                  </blockquote>
                  <div className="flex items-center gap-3">
                    {item.avatarUrl && (
                      <Image
                        src={item.avatarUrl}
                        alt={item.author}
                        width={40}
                        height={40}
                        className="size-10 rounded-full border border-white/40 object-cover"
                        loading="lazy"
                      />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-white">{item.author}</p>
                      <p className="text-xs text-slate-300/70">
                        {[item.role, item.company].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
        {props.children}
      </div>
    </FullWidthSection>
  );
}

function GridMosaicTestimonials(props: NormalizedTestimonialsProps) {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-8">
        <header className="space-y-4">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">{props.eyebrow}</p>
          )}
          {props.headline && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.headline}</h2>}
          {props.description && (
            <p className="max-w-3xl text-base text-muted-foreground">{props.description}</p>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </header>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {props.testimonials.map((item) => (
            <article
              key={`${item.author}-${item.company ?? ""}`}
              className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-muted/40 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
            >
              {item.imageUrl && (
                <div className="relative h-40 overflow-hidden">
                  <Image
                    fill
                    src={item.imageUrl}
                    alt={item.imageAlt ?? item.author}
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-5 p-6">
                {item.rating && (
                  <p className="text-sm text-amber-500">
                    {renderStars(item.rating)} <span className="ml-2 text-xs text-muted-foreground">{item.rating.toFixed(1)}</span>
                  </p>
                )}
                <blockquote className="text-sm leading-relaxed text-muted-foreground/90">
                  “{item.quote}”
                </blockquote>
                <div className="mt-auto space-y-1 text-sm">
                  <p className="font-semibold text-foreground">{item.author}</p>
                  <p className="text-xs text-muted-foreground">
                    {[item.role, item.company].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
        {props.children}
      </div>
    </section>
  );
}

function SplitStoryTestimonials(props: NormalizedTestimonialsProps) {
  const featured = props.testimonials[0];

  if (!featured) {
    return null;
  }

  return (
    <section className="bg-muted/40 py-20">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-6">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">{props.eyebrow}</p>
          )}
          {props.headline && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.headline}</h2>}
          {props.description && (
            <p className="text-base text-muted-foreground">{props.description}</p>
          )}
          {props.highlights.length > 0 && (
            <ul className="space-y-3 text-sm text-muted-foreground">
              {props.highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex size-2 rounded-full bg-primary/60" />
                  {highlight}
                </li>
              ))}
            </ul>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </div>
        <article className="relative overflow-hidden rounded-3xl border border-border/60 bg-background p-8 shadow-xl">
          {featured.imageUrl && (
            <Image
              fill
              src={featured.imageUrl}
              alt={featured.imageAlt ?? featured.author}
              className="absolute inset-0 object-cover opacity-20"
              sizes="(min-width: 1024px) 45vw, 100vw"
              loading="lazy"
            />
          )}
          <div className="relative space-y-6">
            <blockquote className="text-lg leading-relaxed text-foreground/90">
              “{featured.quote}”
            </blockquote>
            <div className="flex items-center gap-4">
              {featured.avatarUrl && (
                <Image
                  src={featured.avatarUrl}
                  alt={featured.author}
                  width={56}
                  height={56}
                  className="size-14 rounded-full border border-border/60 object-cover"
                  loading="lazy"
                />
              )}
              <div>
                <p className="text-base font-semibold text-foreground">{featured.author}</p>
                <p className="text-sm text-muted-foreground">
                  {[featured.role, featured.company].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            {props.testimonials.slice(1).length > 0 && (
              <div className="space-y-4 border-t border-border/60 pt-6">
                {props.testimonials.slice(1, 3).map((item) => (
                  <div key={`${item.author}-${item.company ?? ""}`} className="space-y-2 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{item.author}</p>
                    <p>“{item.quote}”</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function CenteredMinimalTestimonials(props: NormalizedTestimonialsProps) {
  const ratings = props.testimonials.map((item) => item.rating).filter((rating): rating is number => typeof rating === "number");
  const averageRating = ratings.length > 0 ? ratings.reduce((acc, value) => acc + value, 0) / ratings.length : null;

  return (
    <section className="bg-background py-20">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8 px-4 text-center">
        {props.eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary/80">{props.eyebrow}</p>
        )}
        {props.headline && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.headline}</h2>}
        {props.description && (
          <p className="max-w-2xl text-base text-muted-foreground">{props.description}</p>
        )}
        {averageRating && (
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-amber-500">
            {averageRating.toFixed(1)} average rating
          </p>
        )}
        <div className="grid w-full gap-8 text-left sm:grid-cols-2">
          {props.testimonials.map((item) => (
            <article key={`${item.author}-${item.company ?? ""}`} className="space-y-4 rounded-3xl border border-border/50 p-6">
              <blockquote className="text-sm leading-relaxed text-muted-foreground">
                “{item.quote}”
              </blockquote>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-foreground">{item.author}</p>
                <p className="text-xs text-muted-foreground">
                  {[item.role, item.company].filter(Boolean).join(" · ")}
                </p>
              </div>
            </article>
          ))}
        </div>
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} className="justify-center" />
        {props.children}
      </div>
    </section>
  );
}

function OffsetAccentTestimonials(props: NormalizedTestimonialsProps) {
  return (
    <section className="bg-muted/30 py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-8">
        <header className="space-y-4 text-left">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">{props.eyebrow}</p>
          )}
          {props.headline && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.headline}</h2>}
          {props.description && (
            <p className="max-w-3xl text-base text-muted-foreground">{props.description}</p>
          )}
        </header>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {props.testimonials.map((item, index) => (
            <article
              key={`${item.author}-${item.company ?? ""}`}
              className={cn(
                "relative flex h-full flex-col gap-5 rounded-3xl border border-border/60 bg-background p-6 shadow-sm transition",
                index % 2 === 1 ? "md:-mt-10" : "",
                index % 3 === 2 ? "lg:-mt-16" : ""
              )}
            >
              <div className="space-y-4">
                {item.highlight && (
                  <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-primary">
                    {item.highlight}
                  </span>
                )}
                <blockquote className="text-sm leading-relaxed text-muted-foreground">
                  “{item.quote}”
                </blockquote>
              </div>
              <div className="mt-auto flex items-center gap-4">
                {item.avatarUrl && (
                  <Image
                    src={item.avatarUrl}
                    alt={item.author}
                    width={48}
                    height={48}
                    className="size-12 rounded-full border border-border/60 object-cover"
                    loading="lazy"
                  />
                )}
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-foreground">{item.author}</p>
                  <p className="text-xs text-muted-foreground">
                    {[item.role, item.company].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        {props.children}
      </div>
    </section>
  );
}

function BrandPanelTestimonials(props: NormalizedTestimonialsProps) {
  return (
    <FullWidthSection className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-20 text-slate-100">
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-8">
        <div className="space-y-5 text-center">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary/80">{props.eyebrow}</p>
          )}
          {props.headline && <h2 className="text-4xl font-semibold sm:text-5xl">{props.headline}</h2>}
          {props.description && (
            <p className="mx-auto max-w-3xl text-base text-slate-300/80">{props.description}</p>
          )}
          {props.logos.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 text-xs uppercase tracking-[0.35em] text-slate-300/60">
              {props.logos.map((logo) => (
                <span
                  key={logo}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2"
                >
                  <span className="inline-flex size-1.5 rounded-full bg-primary/60" />
                  {logo}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {props.testimonials.map((item) => (
            <article
              key={`${item.author}-${item.company ?? ""}`}
              className="flex h-full flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 text-left shadow-lg"
            >
              {item.rating && (
                <p className="text-amber-300">
                  {renderStars(item.rating)} <span className="ml-3 text-xs uppercase tracking-[0.3em]">{item.rating.toFixed(1)}</span>
                </p>
              )}
              <blockquote className="text-lg leading-relaxed text-slate-100">“{item.quote}”</blockquote>
              <div className="mt-auto flex items-center gap-4">
                {item.avatarUrl && (
                  <Image
                    src={item.avatarUrl}
                    alt={item.author}
                    width={48}
                    height={48}
                    className="size-12 rounded-full border border-white/20 object-cover"
                    loading="lazy"
                  />
                )}
                <div>
                  <p className="text-sm font-semibold text-white">{item.author}</p>
                  <p className="text-xs text-slate-300/80">
                    {[item.role, item.company].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <ActionsRow
          primary={props.primaryCta}
          secondary={props.secondaryCta}
          className="justify-center text-slate-100"
        />
        {props.children}
      </div>
    </FullWidthSection>
  );
}

function PatternedColumnsTestimonials(props: NormalizedTestimonialsProps) {
  return (
    <FullWidthSection className="relative overflow-hidden bg-background py-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.15),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(59,130,246,0.12),_transparent_55%)]" />
      </div>
      <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">{props.eyebrow}</p>
          )}
          {props.headline && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.headline}</h2>}
          {props.description && (
            <p className="text-base text-muted-foreground">{props.description}</p>
          )}
          {props.highlights.length > 0 && (
            <div className="space-y-2 rounded-3xl border border-primary/20 bg-primary/5 p-6 text-sm text-muted-foreground">
              {props.highlights.map((highlight) => (
                <p key={highlight} className="flex items-center gap-3">
                  <span className="inline-flex size-1.5 rounded-full bg-primary/60" />
                  {highlight}
                </p>
              ))}
            </div>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {props.testimonials.map((item) => (
            <article
              key={`${item.author}-${item.company ?? ""}`}
              className="flex h-full flex-col gap-5 rounded-3xl border border-border/50 bg-background/60 p-6 backdrop-blur"
            >
              {item.imageUrl && (
                <div className="relative h-32 overflow-hidden rounded-2xl">
                  <Image
                    fill
                    src={item.imageUrl}
                    alt={item.imageAlt ?? item.author}
                    className="object-cover"
                    sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                </div>
              )}
              <blockquote className="text-sm leading-relaxed text-muted-foreground">
                “{item.quote}”
              </blockquote>
              <div className="mt-auto space-y-1 text-sm">
                <p className="font-semibold text-foreground">{item.author}</p>
                <p className="text-xs text-muted-foreground">
                  {[item.role, item.company].filter(Boolean).join(" · ")}
                </p>
                {item.industry && (
                  <p className="text-xs uppercase tracking-[0.3em] text-primary/70">{item.industry}</p>
                )}
              </div>
            </article>
          ))}
        </div>
        {props.children}
      </div>
    </FullWidthSection>
  );
}

function TimelineReelTestimonials(props: NormalizedTestimonialsProps) {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto grid w-full max-w-5xl gap-12 px-4 sm:px-8 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="space-y-6">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">{props.eyebrow}</p>
          )}
          {props.headline && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.headline}</h2>}
          {props.description && (
            <p className="text-base text-muted-foreground">{props.description}</p>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </div>
        <div className="relative border-l border-border/60 pl-6">
          <div className="absolute left-0 top-0 h-full border-l border-dashed border-border/40" aria-hidden />
          <div className="space-y-10">
            {props.testimonials.map((item, index) => (
              <article key={`${item.author}-${index}`} className="relative space-y-3 pl-6">
                <span className="absolute -left-[15px] top-1 inline-flex size-3 rounded-full border border-background bg-primary" />
                <p className="text-xs uppercase tracking-[0.3em] text-primary/70">
                  {item.location ?? `Milestone ${index + 1}`}
                </p>
                <blockquote className="text-sm leading-relaxed text-muted-foreground">
                  “{item.quote}”
                </blockquote>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-foreground">{item.author}</p>
                  <p className="text-xs text-muted-foreground">
                    {[item.role, item.company].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
        {props.children}
      </div>
    </section>
  );
}

function BubbleStackTestimonials(props: NormalizedTestimonialsProps) {
  return (
    <section className="bg-muted/40 py-20">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 sm:px-8">
        <header className="space-y-4 text-center">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">{props.eyebrow}</p>
          )}
          {props.headline && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.headline}</h2>}
          {props.description && (
            <p className="mx-auto max-w-3xl text-base text-muted-foreground">{props.description}</p>
          )}
        </header>
        <div className="space-y-6">
          {props.testimonials.map((item) => (
            <article
              key={`${item.author}-${item.company ?? ""}`}
              className="relative rounded-3xl border border-border/50 bg-background p-6 shadow-sm"
            >
              <div className="absolute left-10 top-full h-6 w-6 rotate-45 border-b border-r border-border/50 bg-background" aria-hidden />
              <blockquote className="text-sm leading-relaxed text-muted-foreground">
                “{item.quote}”
              </blockquote>
              <div className="mt-4 flex items-center gap-4">
                {item.avatarUrl && (
                  <Image
                    src={item.avatarUrl}
                    alt={item.author}
                    width={48}
                    height={48}
                    className="size-12 rounded-full border border-border/60 object-cover"
                    loading="lazy"
                  />
                )}
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-foreground">{item.author}</p>
                  <p className="text-xs text-muted-foreground">
                    {[item.role, item.company].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} className="justify-center" />
        {props.children}
      </div>
    </section>
  );
}

function PhotoPanelsTestimonials(props: NormalizedTestimonialsProps) {
  return (
    <FullWidthSection className="bg-background py-20">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-8 lg:grid-cols-2">
        <div className="space-y-5">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">{props.eyebrow}</p>
          )}
          {props.headline && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.headline}</h2>}
          {props.description && (
            <p className="text-base text-muted-foreground">{props.description}</p>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </div>
        <div className="grid gap-6">
          {props.testimonials.map((item) => (
            <article
              key={`${item.author}-${item.company ?? ""}`}
              className="relative overflow-hidden rounded-3xl border border-border/50 bg-muted/30"
            >
              {item.imageUrl && (
                <div className="relative h-56 w-full">
                  <Image
                    fill
                    src={item.imageUrl}
                    alt={item.imageAlt ?? item.author}
                    className="object-cover"
                    sizes="(min-width: 1024px) 45vw, 100vw"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="space-y-4 p-6">
                <blockquote className="text-base leading-relaxed text-muted-foreground/90">
                  “{item.quote}”
                </blockquote>
                <div className="flex items-center gap-4">
                  {item.avatarUrl && (
                    <Image
                      src={item.avatarUrl}
                      alt={item.author}
                      width={48}
                      height={48}
                      className="size-12 rounded-full border border-border/60 object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-foreground">{item.author}</p>
                    <p className="text-xs text-muted-foreground">
                      {[item.role, item.company].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
        {props.children}
      </div>
    </FullWidthSection>
  );
}

function MagazineLayoutTestimonials(props: NormalizedTestimonialsProps) {
  const featured = props.testimonials[0];

  if (!featured) {
    return null;
  }

  return (
    <section className="bg-muted/30 py-20">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="space-y-6 rounded-3xl border border-border/60 bg-background p-8 shadow-lg">
          {featured.imageUrl && (
            <div className="relative h-56 overflow-hidden rounded-2xl">
              <Image
                fill
                src={featured.imageUrl}
                alt={featured.imageAlt ?? featured.author}
                className="object-cover"
                sizes="(min-width: 1024px) 45vw, 100vw"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
            </div>
          )}
          <blockquote className="text-lg leading-relaxed text-muted-foreground">
            “{featured.quote}”
          </blockquote>
          <div className="flex items-center gap-4">
            {featured.avatarUrl && (
              <Image
                src={featured.avatarUrl}
                alt={featured.author}
                width={56}
                height={56}
                className="size-14 rounded-full border border-border/60 object-cover"
                loading="lazy"
              />
            )}
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-foreground">{featured.author}</p>
              <p className="text-xs text-muted-foreground">
                {[featured.role, featured.company].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          {featured.metricValue && featured.metricLabel && (
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 text-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-primary/80">{featured.metricLabel}</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{featured.metricValue}</p>
            </div>
          )}
        </article>
        <div className="space-y-6">
          <header className="space-y-3">
            {props.eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">{props.eyebrow}</p>
            )}
            {props.headline && <h3 className="text-3xl font-semibold text-foreground">{props.headline}</h3>}
            {props.description && (
              <p className="text-base text-muted-foreground">{props.description}</p>
            )}
          </header>
          <div className="space-y-5">
            {props.testimonials.slice(1).map((item) => (
              <article key={`${item.author}-${item.company ?? ""}`} className="space-y-3 rounded-3xl border border-border/60 p-6">
                <blockquote className="text-sm leading-relaxed text-muted-foreground">
                  “{item.quote}”
                </blockquote>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-foreground">{item.author}</p>
                  <p className="text-xs text-muted-foreground">
                    {[item.role, item.company].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </div>
        {props.children}
      </div>
    </section>
  );
}

function StatHighlightTestimonials(props: NormalizedTestimonialsProps) {
  return (
    <FullWidthSection className="bg-slate-950 py-20 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-8">
        <header className="space-y-4 text-center">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary/80">{props.eyebrow}</p>
          )}
          {props.headline && <h2 className="text-4xl font-semibold sm:text-5xl">{props.headline}</h2>}
          {props.description && (
            <p className="mx-auto max-w-3xl text-base text-slate-300/80">{props.description}</p>
          )}
          <ActionsRow
            primary={props.primaryCta}
            secondary={props.secondaryCta}
            className="justify-center text-slate-100"
          />
        </header>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {props.testimonials.map((item) => (
            <article
              key={`${item.author}-${item.company ?? ""}`}
              className="flex h-full flex-col gap-5 rounded-3xl border border-white/10 bg-white/5 p-6 text-left shadow-lg"
            >
              {(item.metricValue || item.metricLabel) && (
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-primary/70">{item.metricLabel}</p>
                  <p className="text-3xl font-semibold text-primary">{item.metricValue}</p>
                </div>
              )}
              <blockquote className="text-sm leading-relaxed text-slate-100/90">
                “{item.quote}”
              </blockquote>
              <div className="mt-auto space-y-1 text-sm">
                <p className="font-semibold text-white">{item.author}</p>
                <p className="text-xs text-slate-300/80">
                  {[item.role, item.company].filter(Boolean).join(" · ")}
                </p>
              </div>
            </article>
          ))}
        </div>
        {props.footnote && <p className="text-center text-xs text-slate-400">{props.footnote}</p>}
        {props.children}
      </div>
    </FullWidthSection>
  );
}

function renderStars(rating: number) {
  const rounded = Math.round(rating);
  return "★★★★★".slice(0, Math.max(0, Math.min(5, rounded)));
}

function FullWidthSection({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("relative left-1/2 w-screen -translate-x-1/2", className)}>{children}</section>
  );
}
