/* eslint-disable @next/next/no-img-element */
import React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type ActionConfig = {
  id?: string;
  kind?: string;
  config?: Record<string, unknown>;
};

type BentoMetric = {
  value: string;
  label?: string;
  change?: string;
  positive?: boolean;
};

type BentoMedia = {
  src?: string;
  alt?: string;
  rounded?: boolean;
};

type BentoItem = {
  title?: string;
  description?: string;
  eyebrow?: string;
  badge?: string;
  icon?: string;
  highlight?: string;
  stat?: BentoMetric;
  metrics?: BentoMetric[];
  list?: string[];
  image?: BentoMedia;
  footnote?: string;
  emphasis?: string;
  pill?: string;
  quote?: string;
};

type BentoGridVariant =
  | "product-orbit"
  | "insight-pulse"
  | "workflow-lattice"
  | "creative-dual"
  | "security-grid"
  | "ai-nebula"
  | "success-journey"
  | "event-panels"
  | "learning-lab"
  | "wellness-calm"
  | "commerce-merch"
  | "sustainability-loop";

export interface BentoGridProps {
  eyebrow?: string;
  headline?: string;
  description?: string;
  variant?: BentoGridVariant;
  primaryCta?: ActionConfig | null;
  secondaryCta?: ActionConfig | null;
  items?: BentoItem[] | { items?: BentoItem[] } | null;
  children?: React.ReactNode;
}

interface NormalizedBentoGridProps extends Omit<BentoGridProps, "items"> {
  items: BentoItem[];
}

export function BentoGrid(props: BentoGridProps) {
  const normalized: NormalizedBentoGridProps = {
    ...props,
    items: normalizeList<BentoItem>(props.items),
  };

  switch (normalized.variant ?? "product-orbit") {
    case "insight-pulse":
      return <InsightPulseGrid {...normalized} />;
    case "workflow-lattice":
      return <WorkflowLatticeGrid {...normalized} />;
    case "creative-dual":
      return <CreativeDualGrid {...normalized} />;
    case "security-grid":
      return <SecurityGrid {...normalized} />;
    case "ai-nebula":
      return <AiNebulaGrid {...normalized} />;
    case "success-journey":
      return <SuccessJourneyGrid {...normalized} />;
    case "event-panels":
      return <EventPanelsGrid {...normalized} />;
    case "learning-lab":
      return <LearningLabGrid {...normalized} />;
    case "wellness-calm":
      return <WellnessCalmGrid {...normalized} />;
    case "commerce-merch":
      return <CommerceMerchGrid {...normalized} />;
    case "sustainability-loop":
      return <SustainabilityLoopGrid {...normalized} />;
    case "product-orbit":
    default:
      return <ProductOrbitGrid {...normalized} />;
  }
}

function ProductOrbitGrid(props: NormalizedBentoGridProps) {
  const hero = props.items[0] ?? {};
  const integrations = props.items[1] ?? {};
  const workflows = props.items[2] ?? {};
  const adoption = props.items[3] ?? {};
  const automation = props.items[4] ?? {};
  const roadmap = props.items[5] ?? {};

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-20 sm:px-10">
      <div className="grid gap-10">
        <HeaderBlock props={props} />
        <div className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
          <div className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-10 text-white shadow-xl">
            <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,rgba(79,209,197,0.35),transparent_70%)] lg:block" />
            <div className="relative space-y-6">
              {hero.eyebrow && (
                <span className="rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-teal-200">
                  {hero.eyebrow}
                </span>
              )}
              {hero.title && <h3 className="text-3xl font-semibold tracking-tight">{hero.title}</h3>}
              {hero.description && (
                <p className="max-w-2xl text-sm text-slate-200/80 sm:text-base">{hero.description}</p>
              )}
              {hero.highlight && (
                <div className="rounded-3xl border border-white/20 bg-white/5 px-6 py-4 backdrop-blur">
                  <p className="text-sm font-medium text-teal-100">{hero.highlight}</p>
                </div>
              )}
              {hero.metrics && hero.metrics.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-3">
                  {hero.metrics.map((metric) => (
                    <MetricPill key={`${metric.label}-${metric.value}`} metric={metric} tone="dark" />
                  ))}
                </div>
              )}
            </div>
            <div className="relative mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-100">Release momentum</p>
              <div className="mt-4 grid gap-3 text-sm text-slate-200/70 sm:grid-cols-2">
                {(hero.list ?? []).map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 rounded-full bg-teal-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-6">
            <InfoCard item={integrations} tone="light" className="bg-white" />
            <InfoCard item={workflows} tone="muted" className="bg-slate-100" />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard item={adoption} tone="light" className="bg-white" />
          <InfoCard item={automation} tone="light" className="bg-white" />
          <InfoCard item={roadmap} tone="muted" className="bg-slate-100" />
        </div>
      </div>
    </section>
  );
}

function InsightPulseGrid(props: NormalizedBentoGridProps) {
  const insight = props.items[0] ?? {};
  const experiment = props.items[1] ?? {};
  const retention = props.items[2] ?? {};
  const spotlight = props.items[3] ?? {};
  const signal = props.items[4] ?? {};
  const automation = props.items[5] ?? {};

  return (
    <section className="relative overflow-hidden bg-slate-950 py-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.22),transparent_60%)]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 sm:px-10">
        <HeaderBlock props={props} tone="dark" />
        <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-6">
            <div className="rounded-4xl border border-cyan-400/30 bg-slate-900/80 p-8 shadow-xl shadow-cyan-500/5">
              <div className="space-y-5">
                {insight.badge && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100">
                    <span className="size-1.5 rounded-full bg-cyan-300" />
                    {insight.badge}
                  </span>
                )}
                {insight.title && <h3 className="text-2xl font-semibold text-white sm:text-3xl">{insight.title}</h3>}
                {insight.description && (
                  <p className="text-sm text-slate-300 sm:text-base">{insight.description}</p>
                )}
                {insight.metrics && insight.metrics.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    {insight.metrics.map((metric) => (
                      <MetricCard key={`${metric.label}-${metric.value}`} metric={metric} tone="dark" />
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {(insight.list ?? []).map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <span className="mt-1 size-1.5 rounded-full bg-cyan-300" />
                    <p className="text-sm text-slate-200">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <InfoCard item={spotlight} tone="dark" className="border-cyan-400/20 bg-slate-900/70" />
              <InfoCard item={signal} tone="dark" className="border-cyan-400/20 bg-slate-900/70" />
            </div>
          </div>
          <div className="grid gap-6">
            <InfoCard item={experiment} tone="dark" className="border-cyan-400/30 bg-slate-900/70" />
            <InfoCard item={retention} tone="dark" className="border-cyan-400/20 bg-slate-900/60" />
            <InfoCard item={automation} tone="dark" className="border-cyan-400/10 bg-slate-900/50" />
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkflowLatticeGrid(props: NormalizedBentoGridProps) {
  const planner = props.items[0] ?? {};
  const guardrails = props.items[1] ?? {};
  const reviews = props.items[2] ?? {};
  const automations = props.items[3] ?? {};
  const handoffs = props.items[4] ?? {};
  const retros = props.items[5] ?? {};

  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 sm:px-10">
        <HeaderBlock props={props} />
        <div className="grid gap-6 lg:grid-cols-[1.1fr,1.2fr]">
          <div className="space-y-6">
            <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
              {planner.title && <h3 className="text-2xl font-semibold text-slate-900">{planner.title}</h3>}
              {planner.description && (
                <p className="mt-3 text-sm text-slate-600">{planner.description}</p>
              )}
              <div className="mt-6 space-y-4">
                {(planner.list ?? []).map((item, index) => (
                  <div key={item} className="flex items-start gap-4">
                    <div className="flex size-8 items-center justify-center rounded-full bg-slate-900/5 text-sm font-semibold text-slate-700">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item}</p>
                      {planner.footnote && index === 0 && (
                        <p className="text-xs text-slate-500">{planner.footnote}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <InfoCard item={retros} tone="muted" className="border-slate-200 bg-white" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <InfoCard item={guardrails} tone="muted" className="border-slate-200 bg-white" />
            <InfoCard item={reviews} tone="muted" className="border-slate-200 bg-white" />
            <InfoCard item={automations} tone="muted" className="border-slate-200 bg-white" />
            <InfoCard item={handoffs} tone="muted" className="border-slate-200 bg-white" />
          </div>
        </div>
      </div>
    </section>
  );
}

function CreativeDualGrid(props: NormalizedBentoGridProps) {
  const narrative = props.items[0] ?? {};
  const campaigns = props.items[1] ?? {};
  const gallery = props.items[2] ?? {};
  const palette = props.items[3] ?? {};
  const tone = props.items[4] ?? {};
  const feedback = props.items[5] ?? {};

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-rose-50 via-white to-indigo-50 py-20">
      <div className="absolute inset-y-0 left-1/2 hidden w-1/2 bg-gradient-to-t from-indigo-500/10 via-indigo-500/5 to-transparent lg:block" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 sm:px-10">
        <HeaderBlock props={props} />
        <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
          <div className="grid gap-6">
            <div className="rounded-4xl border border-rose-200 bg-white/80 p-10 shadow-sm backdrop-blur">
              {narrative.icon && (
                <div className="mb-6 inline-flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-2xl">
                  {narrative.icon}
                </div>
              )}
              {narrative.title && <h3 className="text-2xl font-semibold text-slate-900">{narrative.title}</h3>}
              {narrative.description && (
                <p className="mt-4 text-sm text-slate-600">{narrative.description}</p>
              )}
              {(narrative.list ?? []).length > 0 && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {(narrative.list ?? []).map((item) => (
                    <div key={item} className="rounded-2xl border border-rose-200/60 bg-rose-100/40 px-4 py-3 text-sm text-rose-900">
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <InfoCard item={gallery} tone="muted" className="border-indigo-200 bg-white/70" />
          </div>
          <div className="grid gap-6">
            <div className="rounded-4xl border border-indigo-200 bg-indigo-900/90 p-8 text-white shadow-lg">
              {campaigns.badge && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]">
                  <span className="size-1.5 rounded-full bg-indigo-200" />
                  {campaigns.badge}
                </span>
              )}
              {campaigns.title && <h3 className="mt-4 text-xl font-semibold">{campaigns.title}</h3>}
              {campaigns.description && (
                <p className="mt-3 text-sm text-indigo-100">{campaigns.description}</p>
              )}
              {campaigns.metrics && campaigns.metrics.length > 0 && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {campaigns.metrics.map((metric) => (
                    <MetricCard key={`${metric.label}-${metric.value}`} metric={metric} tone="dark" />
                  ))}
                </div>
              )}
            </div>
            <InfoCard item={palette} tone="muted" className="border-rose-200 bg-white/80" />
            <InfoCard item={tone} tone="muted" className="border-indigo-200 bg-white/80" />
            <InfoCard item={feedback} tone="muted" className="border-rose-200 bg-white/80" />
          </div>
        </div>
      </div>
    </section>
  );
}

function SecurityGrid(props: NormalizedBentoGridProps) {
  const baseline = props.items[0] ?? {};
  const compliance = props.items[1] ?? {};
  const encryption = props.items[2] ?? {};
  const audits = props.items[3] ?? {};
  const incidents = props.items[4] ?? {};
  const trust = props.items[5] ?? {};

  return (
    <section className="relative overflow-hidden bg-slate-950 py-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(226,232,240,0.08),transparent_65%)]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 sm:px-10">
        <HeaderBlock props={props} tone="dark" />
        <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
          <div className="space-y-6">
            <div className="rounded-4xl border border-slate-200/20 bg-slate-900/80 p-8 shadow-xl">
              {baseline.title && <h3 className="text-2xl font-semibold text-white">{baseline.title}</h3>}
              {baseline.description && (
                <p className="mt-3 text-sm text-slate-300">{baseline.description}</p>
              )}
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {(baseline.list ?? []).map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200/10 bg-white/5 p-4">
                    <span className="mt-1 size-1.5 rounded-full bg-emerald-300" />
                    <p className="text-sm text-slate-200">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <InfoCard item={trust} tone="dark" className="border-emerald-400/20 bg-slate-900/70" />
          </div>
          <div className="grid gap-6">
            <InfoCard item={compliance} tone="dark" className="border-emerald-300/20 bg-slate-900/70" />
            <InfoCard item={encryption} tone="dark" className="border-emerald-300/20 bg-slate-900/70" />
            <InfoCard item={audits} tone="dark" className="border-emerald-300/20 bg-slate-900/70" />
            <InfoCard item={incidents} tone="dark" className="border-emerald-300/20 bg-slate-900/70" />
          </div>
        </div>
      </div>
    </section>
  );
}

function AiNebulaGrid(props: NormalizedBentoGridProps) {
  const orchestrator = props.items[0] ?? {};
  const copilots = props.items[1] ?? {};
  const studio = props.items[2] ?? {};
  const signals = props.items[3] ?? {};
  const benchmarks = props.items[4] ?? {};
  const ethics = props.items[5] ?? {};

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-950 py-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.4),transparent_60%)]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 sm:px-10 text-white">
        <HeaderBlock props={props} tone="dark" />
        <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
          <div className="space-y-6">
            <div className="rounded-4xl border border-purple-300/30 bg-white/5 p-10 backdrop-blur">
              {orchestrator.title && <h3 className="text-2xl font-semibold">{orchestrator.title}</h3>}
              {orchestrator.description && (
                <p className="mt-4 text-sm text-purple-100/80">{orchestrator.description}</p>
              )}
              {orchestrator.metrics && orchestrator.metrics.length > 0 && (
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {orchestrator.metrics.map((metric) => (
                    <MetricPill key={`${metric.label}-${metric.value}`} metric={metric} tone="dark" />
                  ))}
                </div>
              )}
            </div>
            <InfoCard item={studio} tone="dark" className="border-purple-300/20 bg-white/10" />
          </div>
          <div className="grid gap-6">
            <InfoCard item={copilots} tone="dark" className="border-purple-300/20 bg-white/10" />
            <InfoCard item={signals} tone="dark" className="border-purple-300/20 bg-white/10" />
            <InfoCard item={benchmarks} tone="dark" className="border-purple-300/20 bg-white/10" />
            <InfoCard item={ethics} tone="dark" className="border-purple-300/20 bg-white/10" />
          </div>
        </div>
      </div>
    </section>
  );
}

function SuccessJourneyGrid(props: NormalizedBentoGridProps) {
  const journey = props.items[0] ?? {};
  const onboarding = props.items[1] ?? {};
  const health = props.items[2] ?? {};
  const champions = props.items[3] ?? {};
  const playbooks = props.items[4] ?? {};
  const community = props.items[5] ?? {};

  return (
    <section className="bg-gradient-to-b from-white via-slate-50 to-slate-100 py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 sm:px-10">
        <HeaderBlock props={props} />
        <div className="grid gap-6 lg:grid-cols-[1.1fr,1fr]">
          <div className="space-y-6">
            <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
              {journey.title && <h3 className="text-2xl font-semibold text-slate-900">{journey.title}</h3>}
              {journey.description && (
                <p className="mt-3 text-sm text-slate-600">{journey.description}</p>
              )}
              <div className="mt-6 space-y-4">
                {(journey.list ?? []).map((item, index) => (
                  <div key={item} className="flex items-start gap-4 rounded-2xl bg-slate-900/5 p-4">
                    <div className="mt-1 size-2 rounded-full bg-emerald-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item}</p>
                      {journey.footnote && index === (journey.list?.length ?? 0) - 1 && (
                        <p className="text-xs text-slate-500">{journey.footnote}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <InfoCard item={community} tone="muted" className="border-emerald-200 bg-white" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <InfoCard item={onboarding} tone="muted" className="border-emerald-200 bg-white" />
            <InfoCard item={health} tone="muted" className="border-emerald-200 bg-white" />
            <InfoCard item={champions} tone="muted" className="border-emerald-200 bg-white" />
            <InfoCard item={playbooks} tone="muted" className="border-emerald-200 bg-white" />
          </div>
        </div>
      </div>
    </section>
  );
}

function EventPanelsGrid(props: NormalizedBentoGridProps) {
  const headliner = props.items[0] ?? {};
  const workshop = props.items[1] ?? {};
  const lounge = props.items[2] ?? {};
  const stage = props.items[3] ?? {};
  const stream = props.items[4] ?? {};
  const network = props.items[5] ?? {};

  return (
    <section className="relative overflow-hidden bg-slate-950 py-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,115,179,0.35),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.25),transparent_60%)]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 text-white sm:px-10">
        <HeaderBlock props={props} tone="dark" />
        <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-6">
            <div className="rounded-4xl border border-white/20 bg-white/10 p-10 backdrop-blur">
              {headliner.title && <h3 className="text-2xl font-semibold">{headliner.title}</h3>}
              {headliner.description && (
                <p className="mt-4 text-sm text-slate-200">{headliner.description}</p>
              )}
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {(headliner.list ?? []).map((item) => (
                  <div key={item} className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-slate-200">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <InfoCard item={stage} tone="dark" className="border-cyan-200/30 bg-white/10" />
          </div>
          <div className="grid gap-6">
            <InfoCard item={workshop} tone="dark" className="border-white/20 bg-white/10" />
            <InfoCard item={lounge} tone="dark" className="border-white/20 bg-white/10" />
            <InfoCard item={stream} tone="dark" className="border-white/20 bg-white/10" />
            <InfoCard item={network} tone="dark" className="border-white/20 bg-white/10" />
          </div>
        </div>
      </div>
    </section>
  );
}

function LearningLabGrid(props: NormalizedBentoGridProps) {
  const catalog = props.items[0] ?? {};
  const cohorts = props.items[1] ?? {};
  const mentors = props.items[2] ?? {};
  const projects = props.items[3] ?? {};
  const library = props.items[4] ?? {};
  const badges = props.items[5] ?? {};

  return (
    <section className="bg-gradient-to-br from-sky-50 via-white to-emerald-50 py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 sm:px-10">
        <HeaderBlock props={props} />
        <div className="grid gap-6 lg:grid-cols-[1.1fr,1fr]">
          <div className="space-y-6">
            <div className="rounded-4xl border border-sky-200 bg-white p-8 shadow-sm">
              {catalog.title && <h3 className="text-2xl font-semibold text-slate-900">{catalog.title}</h3>}
              {catalog.description && (
                <p className="mt-4 text-sm text-slate-600">{catalog.description}</p>
              )}
              {(catalog.list ?? []).length > 0 && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {(catalog.list ?? []).map((item) => (
                    <div key={item} className="rounded-2xl border border-sky-200 bg-sky-100/60 px-4 py-3 text-sm text-sky-900">
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <InfoCard item={library} tone="muted" className="border-sky-200 bg-white" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <InfoCard item={cohorts} tone="muted" className="border-sky-200 bg-white" />
            <InfoCard item={mentors} tone="muted" className="border-sky-200 bg-white" />
            <InfoCard item={projects} tone="muted" className="border-sky-200 bg-white" />
            <InfoCard item={badges} tone="muted" className="border-sky-200 bg-white" />
          </div>
        </div>
      </div>
    </section>
  );
}

function WellnessCalmGrid(props: NormalizedBentoGridProps) {
  const programs = props.items[0] ?? {};
  const rituals = props.items[1] ?? {};
  const focus = props.items[2] ?? {};
  const breaks = props.items[3] ?? {};
  const care = props.items[4] ?? {};
  const recovery = props.items[5] ?? {};

  return (
    <section className="bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-900 py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 text-white sm:px-10">
        <HeaderBlock props={props} tone="dark" />
        <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-6">
            <div className="rounded-4xl border border-white/15 bg-white/10 p-8 backdrop-blur">
              {programs.title && <h3 className="text-2xl font-semibold">{programs.title}</h3>}
              {programs.description && (
                <p className="mt-4 text-sm text-emerald-100">{programs.description}</p>
              )}
              {programs.metrics && programs.metrics.length > 0 && (
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {programs.metrics.map((metric) => (
                    <MetricPill key={`${metric.label}-${metric.value}`} metric={metric} tone="dark" />
                  ))}
                </div>
              )}
            </div>
            <InfoCard item={care} tone="dark" className="border-white/20 bg-white/10" />
          </div>
          <div className="grid gap-6">
            <InfoCard item={rituals} tone="dark" className="border-white/20 bg-white/10" />
            <InfoCard item={focus} tone="dark" className="border-white/20 bg-white/10" />
            <InfoCard item={breaks} tone="dark" className="border-white/20 bg-white/10" />
            <InfoCard item={recovery} tone="dark" className="border-white/20 bg-white/10" />
          </div>
        </div>
      </div>
    </section>
  );
}

function CommerceMerchGrid(props: NormalizedBentoGridProps) {
  const flagship = props.items[0] ?? {};
  const conversions = props.items[1] ?? {};
  const merchandising = props.items[2] ?? {};
  const loyalty = props.items[3] ?? {};
  const fulfillment = props.items[4] ?? {};
  const insights = props.items[5] ?? {};

  return (
    <section className="bg-white py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 sm:px-10">
        <HeaderBlock props={props} />
        <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-4xl border border-slate-200 bg-slate-50 p-10">
              <div className="absolute -right-8 -top-8 size-32 rounded-full bg-amber-200/60" />
              <div className="relative space-y-4">
                {flagship.badge && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-amber-600">
                    {flagship.badge}
                  </span>
                )}
                {flagship.title && <h3 className="text-2xl font-semibold text-slate-900">{flagship.title}</h3>}
                {flagship.description && (
                  <p className="text-sm text-slate-600">{flagship.description}</p>
                )}
                {flagship.metrics && flagship.metrics.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    {flagship.metrics.map((metric) => (
                      <MetricCard key={`${metric.label}-${metric.value}`} metric={metric} tone="light" />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <InfoCard item={loyalty} tone="muted" className="border-slate-200 bg-white" />
          </div>
          <div className="grid gap-6">
            <InfoCard item={conversions} tone="muted" className="border-slate-200 bg-white" />
            <InfoCard item={merchandising} tone="muted" className="border-slate-200 bg-white" />
            <InfoCard item={fulfillment} tone="muted" className="border-slate-200 bg-white" />
            <InfoCard item={insights} tone="muted" className="border-slate-200 bg-white" />
          </div>
        </div>
      </div>
    </section>
  );
}

function SustainabilityLoopGrid(props: NormalizedBentoGridProps) {
  const footprint = props.items[0] ?? {};
  const suppliers = props.items[1] ?? {};
  const initiatives = props.items[2] ?? {};
  const reporting = props.items[3] ?? {};
  const offsets = props.items[4] ?? {};
  const storytelling = props.items[5] ?? {};

  return (
    <section className="bg-gradient-to-br from-emerald-50 via-white to-lime-100 py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 sm:px-10">
        <HeaderBlock props={props} />
        <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
          <div className="space-y-6">
            <div className="rounded-4xl border border-emerald-200 bg-white p-8 shadow-sm">
              {footprint.title && <h3 className="text-2xl font-semibold text-slate-900">{footprint.title}</h3>}
              {footprint.description && (
                <p className="mt-3 text-sm text-slate-600">{footprint.description}</p>
              )}
              {footprint.metrics && footprint.metrics.length > 0 && (
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {footprint.metrics.map((metric) => (
                    <MetricCard key={`${metric.label}-${metric.value}`} metric={metric} tone="light" />
                  ))}
                </div>
              )}
            </div>
            <InfoCard item={storytelling} tone="muted" className="border-emerald-200 bg-white" />
          </div>
          <div className="grid gap-6">
            <InfoCard item={suppliers} tone="muted" className="border-emerald-200 bg-white" />
            <InfoCard item={initiatives} tone="muted" className="border-emerald-200 bg-white" />
            <InfoCard item={reporting} tone="muted" className="border-emerald-200 bg-white" />
            <InfoCard item={offsets} tone="muted" className="border-emerald-200 bg-white" />
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoCard({
  item,
  tone,
  className,
}: {
  item: BentoItem;
  tone: "light" | "muted" | "dark";
  className?: string;
}) {
  const badgeClass =
    tone === "dark"
      ? "bg-white/10 text-white"
      : tone === "muted"
        ? "bg-slate-900/5 text-slate-700"
        : "bg-slate-900/5 text-slate-700";

  const titleClass = tone === "dark" ? "text-white" : "text-slate-900";
  const descriptionClass = tone === "dark" ? "text-slate-200" : "text-slate-600";

  return (
    <div className={cn("rounded-3xl border p-6", className)}>
      <div className="space-y-4">
        {item.badge && <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", badgeClass)}>{item.badge}</span>}
        {item.title && <h4 className={cn("text-lg font-semibold", titleClass)}>{item.title}</h4>}
        {item.description && <p className={cn("text-sm", descriptionClass)}>{item.description}</p>}
        {item.stat && <MetricPill metric={item.stat} tone={tone === "dark" ? "dark" : "light"} />}
        {item.metrics && item.metrics.length > 0 && (
          <div className="grid gap-3">
            {item.metrics.map((metric) => (
              <MetricCard key={`${metric.label}-${metric.value}`} metric={metric} tone={tone === "dark" ? "dark" : "light"} />
            ))}
          </div>
        )}
        {(item.list ?? []).length > 0 && (
          <ul className="space-y-2 text-sm">
            {(item.list ?? []).map((entry) => (
              <li key={entry} className="flex items-start gap-2">
                <span className="mt-1 size-1.5 rounded-full bg-current opacity-60" />
                <span className={tone === "dark" ? "text-slate-200" : "text-slate-600"}>{entry}</span>
              </li>
            ))}
          </ul>
        )}
        {item.footnote && <p className="text-xs text-slate-500">{item.footnote}</p>}
        {item.quote && (
          <blockquote className={cn("text-sm italic", tone === "dark" ? "text-slate-100" : "text-slate-700")}>{item.quote}</blockquote>
        )}
        {item.image?.src && (
          <figure className="overflow-hidden rounded-2xl">
            <img
              src={item.image.src}
              alt={item.image.alt ?? "Decorative illustration"}
              className={cn("w-full object-cover", item.image.rounded ? "rounded-2xl" : "")}
              loading="lazy"
            />
          </figure>
        )}
      </div>
    </div>
  );
}

function MetricPill({ metric, tone }: { metric: BentoMetric; tone: "light" | "dark" }) {
  const changeTone = metric.positive === false ? "text-rose-400" : "text-emerald-400";
  const pillTone = tone === "dark" ? "bg-white/10 text-white" : "bg-slate-900/5 text-slate-900";
  const labelTone = tone === "dark" ? "text-slate-200" : "text-slate-600";

  return (
    <div className={cn("rounded-2xl px-4 py-3", pillTone)}>
      <p className="text-sm font-semibold">{metric.value}</p>
      {metric.label && <p className={cn("text-xs", labelTone)}>{metric.label}</p>}
      {metric.change && <p className={cn("mt-1 text-xs font-medium", changeTone)}>{metric.change}</p>}
    </div>
  );
}

function MetricCard({ metric, tone }: { metric: BentoMetric; tone: "light" | "dark" }) {
  const containerTone =
    tone === "dark"
      ? "border-white/20 bg-white/10 text-white"
      : "border-slate-200 bg-white text-slate-900";
  const labelTone = tone === "dark" ? "text-slate-300" : "text-slate-500";
  const changeTone = metric.positive === false ? "text-rose-500" : "text-emerald-500";

  return (
    <div className={cn("rounded-2xl border p-4", containerTone)}>
      <p className="text-lg font-semibold">{metric.value}</p>
      {metric.label && <p className={cn("text-xs", labelTone)}>{metric.label}</p>}
      {metric.change && <p className={cn("mt-2 text-xs font-semibold", changeTone)}>{metric.change}</p>}
    </div>
  );
}

function HeaderBlock({
  props,
  align = "left",
  tone = "light",
}: {
  props: NormalizedBentoGridProps;
  align?: "left" | "center";
  tone?: "light" | "dark";
}) {
  if (!props.eyebrow && !props.headline && !props.description && !props.primaryCta && !props.secondaryCta) {
    return null;
  }

  const textClass = tone === "dark" ? "text-white" : "text-slate-900";
  const bodyClass = tone === "dark" ? "text-slate-200" : "text-slate-600";
  const eyebrowClass = tone === "dark" ? "text-slate-200/70" : "text-slate-500";

  return (
    <div className={cn("space-y-4", align === "center" ? "text-center" : "text-left")}
>
      {props.eyebrow && (
        <p className={cn("text-sm font-semibold uppercase tracking-[0.3em]", eyebrowClass)}>{props.eyebrow}</p>
      )}
      {props.headline && <h2 className={cn("text-3xl font-semibold tracking-tight sm:text-4xl", textClass)}>{props.headline}</h2>}
      {props.description && <p className={cn("max-w-2xl text-sm sm:text-base", bodyClass)}>{props.description}</p>}
      <ActionButtons primary={props.primaryCta} secondary={props.secondaryCta} tone={tone} align={align} />
    </div>
  );
}

function ActionButtons({
  primary,
  secondary,
  tone,
  align,
}: {
  primary?: ActionConfig | null;
  secondary?: ActionConfig | null;
  tone: "light" | "dark";
  align: "left" | "center";
}) {
  if (!primary && !secondary) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-4", align === "center" ? "justify-center" : "justify-start")}
>
      {renderAction(primary, "primary", tone)}
      {renderAction(secondary, "ghost", tone)}
    </div>
  );
}

function renderAction(action: ActionConfig | null | undefined, fallbackVariant: string, tone: "light" | "dark") {
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
        buttonStyles(variant, tone)
      )}
    >
      {label}
    </Link>
  );
}

function buttonStyles(variant: string, tone: "light" | "dark") {
  switch (variant) {
    case "ghost":
      return tone === "dark"
        ? "bg-transparent text-white ring-offset-slate-950 hover:bg-white/10 focus-visible:ring-white/50"
        : "bg-transparent text-slate-900 ring-offset-white hover:bg-slate-900/5 focus-visible:ring-slate-900/40";
    case "secondary":
      return tone === "dark"
        ? "border border-white/20 bg-white/10 text-white ring-offset-slate-950 hover:bg-white/20 focus-visible:ring-white/50"
        : "border border-slate-200 bg-white text-slate-900 ring-offset-white hover:bg-slate-50 focus-visible:ring-slate-900/40";
    case "primary":
    default:
      return tone === "dark"
        ? "bg-cyan-400 text-slate-950 ring-offset-slate-950 hover:bg-cyan-300 focus-visible:ring-cyan-200/70"
        : "bg-slate-900 text-white ring-offset-white hover:bg-slate-800 focus-visible:ring-slate-900/40";
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

