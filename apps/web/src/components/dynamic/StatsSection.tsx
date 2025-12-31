import React from "react";

import { cn } from "@/lib/utils";
import { ActionsRow, normalizeList, type ActionConfig } from "./shared";

type StatsVariant =
  | "glow-grid"
  | "velocity-panel"
  | "milestone-timeline"
  | "split-emphasis"
  | "gradient-cascade"
  | "insight-clusters"
  | "pillars"
  | "radial-progress"
  | "compact-badges"
  | "region-comparison"
  | "impact-cards"
  | "momentum-stream";

type StatMetric = {
  label: string;
  value: string;
  description?: string;
  change?: string;
  changeLabel?: string;
  category?: string;
};

export interface StatsSectionProps {
  eyebrow?: string;
  headline?: string;
  description?: string;
  variant?: StatsVariant;
  metrics?: StatMetric[] | { items?: StatMetric[] } | null;
  highlights?: string[] | { items?: string[] } | null;
  badges?: string[] | { items?: string[] } | null;
  footnote?: string;
  annotation?: string;
  primaryCta?: ActionConfig | null;
  secondaryCta?: ActionConfig | null;
  children?: React.ReactNode;
}

interface NormalizedStatsProps
  extends Omit<StatsSectionProps, "metrics" | "highlights" | "badges"> {
  metrics: StatMetric[];
  highlights: string[];
  badges: string[];
  primaryCta: ActionConfig | null;
  secondaryCta: ActionConfig | null;
}

export function StatsSection(props: StatsSectionProps) {
  const normalized: NormalizedStatsProps = {
    ...props,
    metrics: normalizeList<StatMetric>(props.metrics),
    highlights: normalizeList<string>(props.highlights),
    badges: normalizeList<string>(props.badges),
    primaryCta: props.primaryCta ?? null,
    secondaryCta: props.secondaryCta ?? null,
  };

  switch (normalized.variant ?? "glow-grid") {
    case "velocity-panel":
      return <VelocityPanelStats {...normalized} />;
    case "milestone-timeline":
      return <MilestoneTimelineStats {...normalized} />;
    case "split-emphasis":
      return <SplitEmphasisStats {...normalized} />;
    case "gradient-cascade":
      return <GradientCascadeStats {...normalized} />;
    case "insight-clusters":
      return <InsightClustersStats {...normalized} />;
    case "pillars":
      return <PillarsStats {...normalized} />;
    case "radial-progress":
      return <RadialProgressStats {...normalized} />;
    case "compact-badges":
      return <CompactBadgesStats {...normalized} />;
    case "region-comparison":
      return <RegionComparisonStats {...normalized} />;
    case "impact-cards":
      return <ImpactCardsStats {...normalized} />;
    case "momentum-stream":
      return <MomentumStreamStats {...normalized} />;
    case "glow-grid":
    default:
      return <GlowGridStats {...normalized} />;
  }
}

function GlowGridStats(props: NormalizedStatsProps) {
  return (
    <FullWidthSection className="relative overflow-hidden bg-slate-950 py-20 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-slate-900 to-slate-950" />
        <div className="absolute left-1/2 top-1/2 size-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-3xl motion-safe:animate-pulse" />
      </div>
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-8">
        <header className="space-y-4 text-center">
          {props.badges.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {props.badges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-100/80 transition hover:bg-white/20"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-indigo-200/90">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-4xl font-semibold sm:text-5xl">{props.headline}</h2>
          )}
          {props.description && (
            <p className="mx-auto max-w-3xl text-base text-slate-300/80">
              {props.description}
            </p>
          )}
        </header>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {props.metrics.map((metric) => (
            <article
              key={metric.label}
              className="group relative overflow-hidden rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur transition will-change-transform hover:-translate-y-1 hover:bg-white/10"
            >
              <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent opacity-0 transition group-hover:opacity-100" />
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-100/70">
                {metric.label}
              </p>
              <p className="mt-4 text-4xl font-semibold text-white">{metric.value}</p>
              {metric.change && (
                <p className="mt-2 text-xs text-emerald-300/90">
                  {metric.changeLabel ? `${metric.changeLabel} ` : ""}
                  {metric.change}
                </p>
              )}
              {metric.description && (
                <p className="mt-4 text-sm text-slate-200/80">{metric.description}</p>
              )}
            </article>
          ))}
        </div>
        {props.footnote && (
          <p className="text-center text-xs text-slate-400">{props.footnote}</p>
        )}
        {props.children}
      </div>
    </FullWidthSection>
  );
}

function VelocityPanelStats(props: NormalizedStatsProps) {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 sm:px-8">
        <header className="space-y-4">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">
              {props.headline}
            </h2>
          )}
          {props.description && (
            <p className="max-w-2xl text-base text-muted-foreground">
              {props.description}
            </p>
          )}
          {props.highlights.length > 0 && (
            <ul className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {props.highlights.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="inline-flex size-2 rounded-full bg-primary/60 motion-safe:animate-pulse" />
                  {item}
                </li>
              ))}
            </ul>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {props.metrics.map((metric) => (
            <article
              key={metric.label}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-muted/40 p-6 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">
                    {metric.label}
                  </p>
                  <p className="mt-4 text-3xl font-semibold text-foreground sm:text-4xl">
                    {metric.value}
                  </p>
                </div>
                {metric.change && (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                    {metric.change}
                    {metric.changeLabel ? ` ${metric.changeLabel}` : ""}
                  </span>
                )}
              </div>
              {metric.description && (
                <p className="mt-4 text-sm text-muted-foreground">{metric.description}</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function MilestoneTimelineStats(props: NormalizedStatsProps) {
  return (
    <section className="bg-muted/40 py-20">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-4 sm:px-8">
        <header className="space-y-4 text-center">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
              {props.headline}
            </h2>
          )}
          {props.description && (
            <p className="mx-auto max-w-2xl text-base text-muted-foreground">
              {props.description}
            </p>
          )}
        </header>
        <ol className="relative space-y-10 border-l border-primary/40 pl-10">
          {props.metrics.map((metric, index) => (
            <li key={metric.label} className="relative">
              <span className="absolute -left-14 flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="absolute -left-2 top-1 size-3 rounded-full bg-primary motion-safe:animate-pulse" />
              <div className="space-y-2 rounded-2xl bg-background/80 p-6 shadow-sm transition hover:-translate-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">
                  {metric.label}
                </p>
                <p className="text-2xl font-semibold text-foreground">{metric.value}</p>
                {metric.change && (
                  <p className="text-xs text-emerald-600">
                    {metric.changeLabel ? `${metric.changeLabel} ` : ""}
                    {metric.change}
                  </p>
                )}
                {metric.description && (
                  <p className="text-sm text-muted-foreground">{metric.description}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
        {props.footnote && (
          <p className="text-center text-xs text-muted-foreground">{props.footnote}</p>
        )}
      </div>
    </section>
  );
}

function SplitEmphasisStats(props: NormalizedStatsProps) {
  const [primaryMetric, ...supportingMetrics] = props.metrics;
  return (
    <FullWidthSection className="bg-slate-900 py-20 text-slate-100">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:items-center">
        <div className="space-y-6">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-4xl font-semibold sm:text-5xl">{props.headline}</h2>
          )}
          {props.description && (
            <p className="max-w-xl text-base text-slate-300/80">{props.description}</p>
          )}
          {props.highlights.length > 0 && (
            <ul className="space-y-3 text-sm text-slate-300/80">
              {props.highlights.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex size-2 rounded-full bg-primary/70 motion-safe:animate-pulse" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          <ActionsRow
            primary={props.primaryCta}
            secondary={props.secondaryCta}
            className="justify-start"
          />
        </div>
        <aside className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl">
          <div className="absolute inset-x-8 top-8 h-32 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative space-y-6">
            {primaryMetric ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">
                  {primaryMetric.label}
                </p>
                <p className="text-5xl font-semibold text-white">{primaryMetric.value}</p>
                {primaryMetric.description && (
                  <p className="text-sm text-slate-200/80">{primaryMetric.description}</p>
                )}
              </div>
            ) : null}
            <div className="grid gap-4">
              {supportingMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="flex items-start justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition hover:-translate-y-1"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-200/70">
                      {metric.label}
                    </p>
                    {metric.description && (
                      <p className="mt-2 text-xs text-slate-300/70">{metric.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-white">{metric.value}</p>
                    {metric.change && (
                      <p className="text-xs text-emerald-300/80">
                        {metric.changeLabel ? `${metric.changeLabel} ` : ""}
                        {metric.change}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </FullWidthSection>
  );
}

function GradientCascadeStats(props: NormalizedStatsProps) {
  const gradientPalette = [
    "from-violet-500/20 to-indigo-500/30",
    "from-sky-500/20 to-cyan-500/30",
    "from-emerald-500/20 to-teal-500/30",
    "from-amber-500/20 to-orange-500/30",
  ];
  return (
    <section className="bg-background py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-8">
        <header className="space-y-4 text-center">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">
              {props.headline}
            </h2>
          )}
          {props.description && (
            <p className="mx-auto max-w-3xl text-base text-muted-foreground">
              {props.description}
            </p>
          )}
        </header>
        <div className="grid gap-6 lg:grid-cols-3">
          {props.metrics.map((metric, index) => (
            <article
              key={metric.label}
              className={cn(
                "relative overflow-hidden rounded-3xl border border-border/60 bg-muted/30 p-8 transition hover:-translate-y-1 hover:shadow-xl",
                "before:absolute before:inset-0 before:bg-gradient-to-br before:opacity-90 before:blur-2xl before:transition",
                `before:${gradientPalette[index % gradientPalette.length]}`
              )}
            >
              <div className="relative space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">
                  {metric.label}
                </p>
                <p className="text-4xl font-semibold text-foreground">{metric.value}</p>
                {metric.change && (
                  <p className="text-xs text-emerald-600">
                    {metric.changeLabel ? `${metric.changeLabel} ` : ""}
                    {metric.change}
                  </p>
                )}
                {metric.description && (
                  <p className="text-sm text-muted-foreground">{metric.description}</p>
                )}
              </div>
            </article>
          ))}
        </div>
        {props.footnote && (
          <p className="text-center text-xs text-muted-foreground">{props.footnote}</p>
        )}
      </div>
    </section>
  );
}

function InsightClustersStats(props: NormalizedStatsProps) {
  return (
    <FullWidthSection className="bg-slate-950 py-20 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-8">
        <header className="space-y-4 text-center">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200/80">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-4xl font-semibold sm:text-5xl">{props.headline}</h2>
          )}
          {props.description && (
            <p className="mx-auto max-w-3xl text-base text-slate-300/80">
              {props.description}
            </p>
          )}
        </header>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {props.metrics.map((metric) => (
            <article
              key={metric.label}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-8 backdrop-blur transition hover:-translate-y-1"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="relative space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100/70">
                  {metric.label}
                </p>
                <p className="text-4xl font-semibold text-white">{metric.value}</p>
                {metric.change && (
                  <p className="text-xs text-emerald-300/80">
                    {metric.changeLabel ? `${metric.changeLabel} ` : ""}
                    {metric.change}
                  </p>
                )}
                {metric.description && (
                  <p className="text-sm text-slate-200/80">{metric.description}</p>
                )}
              </div>
            </article>
          ))}
        </div>
        {props.footnote && (
          <p className="text-center text-xs text-slate-400">{props.footnote}</p>
        )}
      </div>
    </FullWidthSection>
  );
}

function PillarsStats(props: NormalizedStatsProps) {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-8">
        <header className="space-y-4 text-center">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">
              {props.headline}
            </h2>
          )}
          {props.description && (
            <p className="mx-auto max-w-3xl text-base text-muted-foreground">
              {props.description}
            </p>
          )}
          {props.highlights.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              {props.highlights.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 transition hover:-translate-y-0.5"
                >
                  <span className="inline-flex size-2 rounded-full bg-primary/60 motion-safe:animate-ping" />
                  {item}
                </span>
              ))}
            </div>
          )}
        </header>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {props.metrics.map((metric) => (
            <article
              key={metric.label}
              className="flex h-full flex-col gap-4 rounded-3xl border border-border/60 bg-muted/40 p-8 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">
                {metric.label}
              </p>
              <p className="text-4xl font-semibold text-foreground">{metric.value}</p>
              {metric.description && (
                <p className="text-sm text-muted-foreground">{metric.description}</p>
              )}
              {metric.change && (
                <p className="text-xs text-emerald-600">
                  {metric.changeLabel ? `${metric.changeLabel} ` : ""}
                  {metric.change}
                </p>
              )}
            </article>
          ))}
        </div>
        {props.footnote && (
          <p className="text-center text-xs text-muted-foreground">{props.footnote}</p>
        )}
      </div>
    </section>
  );
}

function RadialProgressStats(props: NormalizedStatsProps) {
  const [primaryMetric, ...supportingMetrics] = props.metrics;
  return (
    <FullWidthSection className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-20 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-12 px-4 sm:px-8">
        <header className="space-y-4 text-center">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-200/80">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-4xl font-semibold sm:text-5xl">{props.headline}</h2>
          )}
          {props.description && (
            <p className="mx-auto max-w-2xl text-base text-slate-300/80">
              {props.description}
            </p>
          )}
        </header>
        <div className="flex w-full flex-col items-center gap-10 lg:flex-row lg:items-stretch">
          <div className="relative mx-auto flex size-56 items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-cyan-400/30 motion-safe:animate-pulse" />
            <div className="absolute inset-6 rounded-full border border-cyan-500/30" />
            <div className="absolute inset-10 rounded-full bg-slate-900/80" />
            <div className="relative z-10 flex size-full flex-col items-center justify-center gap-2 rounded-full bg-gradient-to-br from-cyan-500/20 via-slate-900 to-slate-950 text-center shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-100/70">
                {primaryMetric?.label ?? "Primary"}
              </p>
              <p className="text-4xl font-semibold text-white sm:text-5xl">
                {primaryMetric?.value ?? "—"}
              </p>
              {primaryMetric?.change && (
                <p className="text-xs text-emerald-300/80">
                  {primaryMetric?.changeLabel ? `${primaryMetric.changeLabel} ` : ""}
                  {primaryMetric.change}
                </p>
              )}
              {primaryMetric?.description && (
                <p className="max-w-[180px] text-xs text-slate-300/80">
                  {primaryMetric.description}
                </p>
              )}
            </div>
          </div>
          <div className="grid flex-1 gap-4">
            {supportingMetrics.map((metric) => (
              <div
                key={metric.label}
                className="flex items-start justify-between rounded-3xl border border-white/10 bg-white/5 px-6 py-5 transition hover:-translate-y-1"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100/70">
                    {metric.label}
                  </p>
                  {metric.description && (
                    <p className="mt-2 text-xs text-slate-200/80">{metric.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-white">{metric.value}</p>
                  {metric.change && (
                    <p className="text-xs text-emerald-300/80">
                      {metric.changeLabel ? `${metric.changeLabel} ` : ""}
                      {metric.change}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        {props.footnote && (
          <p className="text-center text-xs text-slate-400">{props.footnote}</p>
        )}
      </div>
    </FullWidthSection>
  );
}

function CompactBadgesStats(props: NormalizedStatsProps) {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 sm:px-8">
        <header className="space-y-4 text-center">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
              {props.headline}
            </h2>
          )}
          {props.description && (
            <p className="mx-auto max-w-2xl text-base text-muted-foreground">
              {props.description}
            </p>
          )}
        </header>
        <div className="flex flex-wrap justify-center gap-4">
          {props.metrics.map((metric) => (
            <span
              key={metric.label}
              className="group inline-flex flex-col items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-5 py-4 text-center text-sm font-medium text-foreground shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="text-2xl font-semibold text-primary">{metric.value}</span>
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
                {metric.label}
              </span>
              {metric.change && (
                <span className="text-[11px] text-emerald-600">
                  {metric.changeLabel ? `${metric.changeLabel} ` : ""}
                  {metric.change}
                </span>
              )}
            </span>
          ))}
        </div>
        {props.footnote && (
          <p className="text-center text-xs text-muted-foreground">{props.footnote}</p>
        )}
      </div>
    </section>
  );
}

function RegionComparisonStats(props: NormalizedStatsProps) {
  return (
    <section className="bg-muted/50 py-20">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 sm:px-8">
        <header className="space-y-4">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">
              {props.headline}
            </h2>
          )}
          {props.description && (
            <p className="max-w-3xl text-base text-muted-foreground">
              {props.description}
            </p>
          )}
        </header>
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-background shadow-lg">
          <table className="min-w-full divide-y divide-border/60 text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <tr>
                <th scope="col" className="px-6 py-4">
                  Region
                </th>
                <th scope="col" className="px-6 py-4">
                  Metric
                </th>
                <th scope="col" className="px-6 py-4 text-right">
                  Value
                </th>
                <th scope="col" className="px-6 py-4 text-right">
                  Change
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {props.metrics.map((metric) => (
                <tr key={`${metric.category ?? metric.label}-${metric.value}`} className="transition hover:bg-muted/60">
                  <td className="px-6 py-4 text-sm font-semibold text-foreground">
                    {metric.category ?? metric.label}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {metric.label}
                  </td>
                  <td className="px-6 py-4 text-right text-base font-semibold text-foreground">
                    {metric.value}
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-emerald-600">
                    {metric.changeLabel ? `${metric.changeLabel} ` : ""}
                    {metric.change ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {props.annotation && (
          <p className="text-xs text-muted-foreground">{props.annotation}</p>
        )}
      </div>
    </section>
  );
}

function ImpactCardsStats(props: NormalizedStatsProps) {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-8">
        <header className="space-y-4 text-center">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">
              {props.headline}
            </h2>
          )}
          {props.description && (
            <p className="mx-auto max-w-3xl text-base text-muted-foreground">
              {props.description}
            </p>
          )}
        </header>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {props.metrics.map((metric) => (
            <article
              key={metric.label}
              className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl border border-border/60 bg-muted/40 p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="relative space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">
                  {metric.label}
                </p>
                <p className="text-4xl font-semibold text-foreground">{metric.value}</p>
                {metric.change && (
                  <p className="text-xs text-emerald-600">
                    {metric.changeLabel ? `${metric.changeLabel} ` : ""}
                    {metric.change}
                  </p>
                )}
                {metric.description && (
                  <p className="text-sm text-muted-foreground">{metric.description}</p>
                )}
              </div>
            </article>
          ))}
        </div>
        {props.footnote && (
          <p className="text-center text-xs text-muted-foreground">{props.footnote}</p>
        )}
      </div>
    </section>
  );
}

function MomentumStreamStats(props: NormalizedStatsProps) {
  return (
    <FullWidthSection className="relative overflow-hidden bg-slate-950 py-20 text-slate-100">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-emerald-400 to-primary motion-safe:animate-pulse" />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 sm:px-8">
        <header className="space-y-4 text-center">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-200/80">
              {props.eyebrow}
            </p>
          )}
          {props.headline && (
            <h2 className="text-4xl font-semibold sm:text-5xl">{props.headline}</h2>
          )}
          {props.description && (
            <p className="mx-auto max-w-3xl text-base text-slate-300/80">
              {props.description}
            </p>
          )}
        </header>
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 transparent-scrollbar">
            {props.metrics.map((metric) => (
              <div
                key={metric.label}
                className="snap-center rounded-2xl border border-white/10 bg-white/10 px-6 py-5 backdrop-blur transition hover:-translate-y-1"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200/70">
                  {metric.label}
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">{metric.value}</p>
                {metric.change && (
                  <p className="mt-2 text-xs text-emerald-300/80">
                    {metric.changeLabel ? `${metric.changeLabel} ` : ""}
                    {metric.change}
                  </p>
                )}
                {metric.description && (
                  <p className="mt-3 max-w-[220px] text-sm text-slate-200/70">{metric.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
        {props.badges.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-300/70">
            {props.badges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2"
              >
                <span className="inline-flex size-1.5 rounded-full bg-sky-300 motion-safe:animate-ping" />
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>
    </FullWidthSection>
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
