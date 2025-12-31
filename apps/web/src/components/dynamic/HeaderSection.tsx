/* eslint-disable @next/next/no-img-element */
import React from "react";

import { cn } from "@/lib/utils";

import {
  ActionsRow,
  type ActionConfig,
  buttonStyles,
  normalizeList,
} from "./shared";

type Metric = {
  label: string;
  value: string;
  caption?: string;
};

type Breadcrumb = {
  label: string;
  href?: string;
};

type TabItem = {
  label: string;
  description?: string;
  href?: string;
  active?: boolean;
};

type MetaItem = {
  label: string;
  value: string;
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

type Announcement = {
  label?: string;
  message?: string;
  href?: string;
  timestamp?: string;
};

type HeaderVariant =
  | "gradient-orbit"
  | "image-cascade"
  | "card-beam"
  | "metric-stride"
  | "split-spotlight"
  | "centered-pill"
  | "breadcrumb-ledger"
  | "search-hub"
  | "tabbed-overview"
  | "video-trailer"
  | "logo-array"
  | "announcement-bar";

export interface HeaderSectionProps {
  eyebrow?: string;
  headline?: string;
  description?: string;
  highlight?: string;
  badge?: string;
  variant?: HeaderVariant;
  primaryCta?: ActionConfig | null;
  secondaryCta?: ActionConfig | null;
  highlights?: string[] | { items?: string[] } | null;
  metrics?: Metric[] | { items?: Metric[] } | null;
  tabs?: TabItem[] | { items?: TabItem[] } | null;
  breadcrumbs?: Breadcrumb[] | { items?: Breadcrumb[] } | null;
  logos?: string[] | { items?: string[] } | null;
  meta?: MetaItem[] | { items?: MetaItem[] } | null;
  image?: ImageAsset | null;
  video?: VideoAsset | null;
  search?: {
    placeholder?: string;
    buttonLabel?: string;
    helpText?: string;
  } | null;
  announcement?: Announcement | null;
  children?: React.ReactNode;
}

interface NormalizedHeaderProps
  extends Omit<
    HeaderSectionProps,
    "highlights" | "metrics" | "tabs" | "breadcrumbs" | "logos" | "meta"
  > {
  highlights: string[];
  metrics: Metric[];
  tabs: TabItem[];
  breadcrumbs: Breadcrumb[];
  logos: string[];
  meta: MetaItem[];
}

export function HeaderSection(props: HeaderSectionProps) {
  const normalized: NormalizedHeaderProps = {
    ...props,
    highlights: normalizeList<string>(props.highlights),
    metrics: normalizeList<Metric>(props.metrics),
    tabs: normalizeList<TabItem>(props.tabs),
    breadcrumbs: normalizeList<Breadcrumb>(props.breadcrumbs),
    logos: normalizeList<string>(props.logos),
    meta: normalizeList<MetaItem>(props.meta),
  };

  switch (normalized.variant ?? "gradient-orbit") {
    case "image-cascade":
      return <ImageCascadeHeader {...normalized} />;
    case "card-beam":
      return <CardBeamHeader {...normalized} />;
    case "metric-stride":
      return <MetricStrideHeader {...normalized} />;
    case "split-spotlight":
      return <SplitSpotlightHeader {...normalized} />;
    case "centered-pill":
      return <CenteredPillHeader {...normalized} />;
    case "breadcrumb-ledger":
      return <BreadcrumbLedgerHeader {...normalized} />;
    case "search-hub":
      return <SearchHubHeader {...normalized} />;
    case "tabbed-overview":
      return <TabbedOverviewHeader {...normalized} />;
    case "video-trailer":
      return <VideoTrailerHeader {...normalized} />;
    case "logo-array":
      return <LogoArrayHeader {...normalized} />;
    case "announcement-bar":
      return <AnnouncementBarHeader {...normalized} />;
    case "gradient-orbit":
    default:
      return <GradientOrbitHeader {...normalized} />;
  }
}

function GradientOrbitHeader(props: NormalizedHeaderProps) {
  return (
    <FullBleedSection className="relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.28),transparent_60%)]" />
        <div className="absolute inset-y-0 -left-1/2 h-full w-[120%] rotate-12 bg-gradient-to-r from-indigo-600/30 via-transparent to-cyan-500/40 blur-3xl" />
      </div>
      <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-20 text-center">
        {props.badge && (
          <span className="rounded-full border border-white/25 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100">
            {props.badge}
          </span>
        )}
        {props.eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200/80">
            {props.eyebrow}
          </p>
        )}
        {props.headline && (
          <h1 className="text-balance text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl">
            {props.headline}
          </h1>
        )}
        {props.highlight && (
          <span className="rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-100">
            {props.highlight}
          </span>
        )}
        {props.description && (
          <p className="max-w-3xl text-pretty text-lg text-slate-200/85 sm:text-xl">
            {props.description}
          </p>
        )}
        <ActionsRow
          primary={props.primaryCta}
          secondary={props.secondaryCta}
          className="justify-center"
        />
        {props.highlights.length > 0 && (
          <ul className="grid gap-3 text-sm text-slate-200/75 sm:grid-cols-2">
            {props.highlights.map((item) => (
              <li key={item} className="flex items-start gap-3 text-left">
                <span className="mt-1 inline-flex size-2 rounded-full bg-cyan-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </FullBleedSection>
  );
}

function ImageCascadeHeader(props: NormalizedHeaderProps) {
  return (
    <FullBleedSection className="bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:flex-row lg:items-center lg:gap-16">
        <div className="max-w-xl space-y-6">
          {props.badge && (
            <span className="inline-flex w-fit items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              {props.badge}
            </span>
          )}
          {props.headline && (
            <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base text-muted-foreground sm:text-lg">
              {props.description}
            </p>
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
        <MediaFigure
          image={props.image}
          fallback={props.video?.thumbnail}
          className="overflow-hidden rounded-3xl border border-border/60 shadow-2xl shadow-primary/20"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-primary/30 via-transparent to-transparent" />
        </MediaFigure>
      </div>
    </FullBleedSection>
  );
}

function CardBeamHeader(props: NormalizedHeaderProps) {
  return (
    <FullBleedSection className="bg-slate-950 py-20 text-white">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/5 p-10 shadow-[0_30px_80px_-40px_rgba(56,189,248,0.5)]">
          <div className="pointer-events-none absolute -top-20 right-10 size-48 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative space-y-6">
            {props.eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/75">
                {props.eyebrow}
              </p>
            )}
            {props.headline && (
              <h1 className="text-4xl font-semibold sm:text-5xl">
                {props.headline}
              </h1>
            )}
            {props.description && (
              <p className="max-w-3xl text-lg text-slate-200/80">
                {props.description}
              </p>
            )}
            {props.highlights.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {props.highlights.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-slate-100"
                  >
                    {item}
                  </div>
                ))}
              </div>
            )}
            <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
          </div>
        </div>
      </div>
    </FullBleedSection>
  );
}

function MetricStrideHeader(props: NormalizedHeaderProps) {
  return (
    <FullBleedSection className="bg-background py-20">
      <div className="mx-auto max-w-6xl space-y-10 px-6">
        <div className="max-w-3xl space-y-4">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base text-muted-foreground sm:text-lg">
              {props.description}
            </p>
          )}
        </div>
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        {props.metrics.length > 0 && (
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {props.metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm"
              >
                <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  {metric.label}
                </dt>
                <dd className="mt-3 text-3xl font-semibold text-foreground">{metric.value}</dd>
                {metric.caption && (
                  <p className="mt-2 text-sm text-muted-foreground">{metric.caption}</p>
                )}
              </div>
            ))}
          </dl>
        )}
      </div>
    </FullBleedSection>
  );
}

function SplitSpotlightHeader(props: NormalizedHeaderProps) {
  return (
    <FullBleedSection className="bg-gradient-to-br from-background via-background to-muted/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:flex-row lg:items-center">
        <div className="max-w-xl space-y-6">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base text-muted-foreground sm:text-lg">
              {props.description}
            </p>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </div>
        <div className="w-full max-w-sm space-y-6 rounded-3xl border border-border/60 bg-background/80 p-8 shadow-2xl">
          {props.highlights.length > 0 && (
            <ul className="space-y-4 text-sm text-muted-foreground">
              {props.highlights.map((item) => (
                <li key={item} className="rounded-2xl border border-dashed border-border/60 px-4 py-3">
                  {item}
                </li>
              ))}
            </ul>
          )}
          <MediaFigure
            image={props.image}
            fallback={props.video?.thumbnail}
            aspect="aspect-[4/3]"
            className="overflow-hidden rounded-2xl border border-border/60"
          />
        </div>
      </div>
    </FullBleedSection>
  );
}

function CenteredPillHeader(props: NormalizedHeaderProps) {
  return (
    <FullBleedSection className="bg-background py-20">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 text-center">
        {props.badge && (
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            {props.badge}
          </span>
        )}
        {props.headline && (
          <h1 className="text-balance text-4xl font-semibold text-foreground sm:text-5xl">
            {props.headline}
          </h1>
        )}
        {props.highlight && (
          <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">
            {props.highlight}
          </p>
        )}
        {props.description && (
          <p className="text-lg text-muted-foreground">{props.description}</p>
        )}
        <ActionsRow
          primary={props.primaryCta}
          secondary={props.secondaryCta}
          className="justify-center"
        />
        {props.highlights.length > 0 && (
          <div className="grid w-full gap-4 text-sm text-muted-foreground sm:grid-cols-3">
            {props.highlights.map((item) => (
              <div key={item} className="rounded-2xl border border-border/60 px-4 py-3">
                {item}
              </div>
            ))}
          </div>
        )}
      </div>
    </FullBleedSection>
  );
}

function BreadcrumbLedgerHeader(props: NormalizedHeaderProps) {
  return (
    <FullBleedSection className="bg-muted/30 py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6">
        {props.breadcrumbs.length > 0 && <BreadcrumbTrail items={props.breadcrumbs} />}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-6">
            {props.headline && (
              <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">
                {props.headline}
              </h1>
            )}
            {props.description && (
              <p className="text-base text-muted-foreground sm:text-lg">
                {props.description}
              </p>
            )}
            <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
          </div>
          {props.meta.length > 0 && (
            <dl className="grid flex-1 gap-6 rounded-3xl border border-border/60 bg-background p-6 sm:grid-cols-2">
              {props.meta.map((item) => (
                <div key={item.label}>
                  <dt className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="mt-2 text-lg font-semibold text-foreground">{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </FullBleedSection>
  );
}

function SearchHubHeader(props: NormalizedHeaderProps) {
  const placeholder = props.search?.placeholder ?? "Search";
  const buttonLabel = props.search?.buttonLabel ?? "Search";
  return (
    <FullBleedSection className="bg-background py-18 sm:py-20">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6">
        {props.badge && (
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            {props.badge}
          </span>
        )}
        {props.headline && (
          <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">
            {props.headline}
          </h1>
        )}
        {props.description && (
          <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
            {props.description}
          </p>
        )}
        <form className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-card/70 p-6 shadow-sm sm:flex-row sm:items-center">
          <div className="flex-1">
            <label className="sr-only" htmlFor="header-search-input">
              {placeholder}
            </label>
            <input
              id="header-search-input"
              type="search"
              placeholder={placeholder}
              className="w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <button
            type="submit"
            className={cn(
              "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              buttonStyles("primary")
            )}
          >
            {buttonLabel}
          </button>
        </form>
        {props.search?.helpText && (
          <p className="text-sm text-muted-foreground">{props.search.helpText}</p>
        )}
        {props.highlights.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {props.highlights.map((item) => (
              <span key={item} className="inline-flex items-center rounded-full border border-border/60 px-3 py-1">
                {item}
              </span>
            ))}
          </div>
        )}
      </div>
    </FullBleedSection>
  );
}

function TabbedOverviewHeader(props: NormalizedHeaderProps) {
  return (
    <FullBleedSection className="bg-muted/40 py-18 sm:py-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6">
        <div className="max-w-3xl space-y-4">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-base text-muted-foreground sm:text-lg">
              {props.description}
            </p>
          )}
        </div>
        {props.tabs.length > 0 && (
          <div className="overflow-hidden rounded-3xl border border-border/60 bg-background/80 p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row">
              {props.tabs.map((tab, index) => {
                const isActive = tab.active ?? index === 0;
                return (
                  <a
                    key={tab.label}
                    href={tab.href ?? "#"}
                    className={cn(
                      "flex flex-1 flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition",
                      isActive
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-transparent hover:border-border/60 hover:bg-muted/60"
                    )}
                  >
                    <span className="text-sm font-semibold">{tab.label}</span>
                    {tab.description && (
                      <span className="text-xs text-muted-foreground">{tab.description}</span>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        )}
        <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
      </div>
    </FullBleedSection>
  );
}

function VideoTrailerHeader(props: NormalizedHeaderProps) {
  const thumbnail = props.video?.thumbnail ?? props.image?.src;
  const url = props.video?.url ?? "#";
  const label = props.video?.label ?? "Watch trailer";
  return (
    <FullBleedSection className="bg-slate-950 py-20 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 lg:flex-row lg:items-center">
        <div className="max-w-xl space-y-6">
          {props.badge && (
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/90">
              {props.badge}
            </span>
          )}
          {props.headline && (
            <h1 className="text-4xl font-semibold sm:text-5xl">
              {props.headline}
            </h1>
          )}
          {props.description && (
            <p className="text-lg text-slate-200/80">{props.description}</p>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </div>
        <div className="relative w-full max-w-xl">
          {thumbnail && (
            <a
              href={url}
              className="group relative block overflow-hidden rounded-3xl border border-white/15"
            >
              <img
                src={thumbnail}
                alt={props.image?.alt ?? "Video preview"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent transition-opacity group-hover:opacity-90" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                <span className="inline-flex items-center justify-center rounded-full bg-white/20 p-4 backdrop-blur">
                  <span className="inline-flex size-10 items-center justify-center rounded-full bg-white text-slate-900">▶</span>
                </span>
                <span className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
                  {label}
                </span>
              </div>
            </a>
          )}
        </div>
      </div>
    </FullBleedSection>
  );
}

function LogoArrayHeader(props: NormalizedHeaderProps) {
  return (
    <FullBleedSection className="bg-background py-18 sm:py-20">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 text-center">
        {props.badge && (
          <span className="inline-flex items-center rounded-full border border-border/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            {props.badge}
          </span>
        )}
        {props.headline && (
          <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">
            {props.headline}
          </h1>
        )}
        {props.description && (
          <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
            {props.description}
          </p>
        )}
        {props.logos.length > 0 && (
          <div className="grid w-full grid-cols-2 gap-4 text-sm text-muted-foreground sm:grid-cols-3">
            {props.logos.map((logo) => (
              <div
                key={logo}
                className="flex items-center justify-center rounded-2xl border border-border/60 bg-card px-4 py-3"
              >
                {logo}
              </div>
            ))}
          </div>
        )}
        <ActionsRow
          primary={props.primaryCta}
          secondary={props.secondaryCta}
          className="justify-center"
        />
      </div>
    </FullBleedSection>
  );
}

function AnnouncementBarHeader(props: NormalizedHeaderProps) {
  const announcement = props.announcement;
  return (
    <FullBleedSection className="bg-muted/40 py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 text-center sm:text-left">
        {announcement && (
          <div className="flex flex-col items-center justify-between gap-3 rounded-full border border-border/60 bg-background px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground sm:flex-row">
            <div className="flex items-center gap-2">
              {announcement.label && <span>{announcement.label}</span>}
              {announcement.timestamp && (
                <span className="text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground/70">
                  {announcement.timestamp}
                </span>
              )}
            </div>
            {announcement.href ? (
              <a
                href={announcement.href}
                className="text-[0.65rem] uppercase tracking-[0.4em] text-primary"
              >
                {announcement.message ?? "Read the update"}
              </a>
            ) : (
              <span className="text-[0.65rem] uppercase tracking-[0.4em] text-primary">
                {announcement.message}
              </span>
            )}
          </div>
        )}
        {props.headline && (
          <h1 className="text-balance text-4xl font-semibold text-foreground sm:text-5xl">
            {props.headline}
          </h1>
        )}
        {props.description && (
          <p className="text-base text-muted-foreground sm:text-lg">
            {props.description}
          </p>
        )}
        <ActionsRow
          primary={props.primaryCta}
          secondary={props.secondaryCta}
          className="justify-center sm:justify-start"
        />
      </div>
    </FullBleedSection>
  );
}

function BreadcrumbTrail({ items }: { items: Breadcrumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <React.Fragment key={item.label}>
            {index > 0 && <span className="text-muted-foreground/60">/</span>}
            {item.href ? (
              <a href={item.href} className="hover:text-foreground">
                {item.label}
              </a>
            ) : (
              <span>{item.label}</span>
            )}
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
}

function MediaFigure({
  image,
  fallback,
  className,
  aspect,
  children,
}: {
  image?: ImageAsset | null;
  fallback?: string | null;
  className?: string;
  aspect?: string;
  children?: React.ReactNode;
}) {
  const src = image?.src ?? fallback ?? null;
  if (!src) {
    return null;
  }
  return (
    <figure className={cn("relative", aspect ?? "", className)}>
      <img
        src={src}
        alt={image?.alt ?? "Decorative header media"}
        className="h-full w-full object-cover"
        loading="lazy"
      />
      {children}
    </figure>
  );
}

function FullBleedSection({
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
