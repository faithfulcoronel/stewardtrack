import React from "react";

import { cn } from "@/lib/utils";
import { ActionsRow, normalizeList, renderAction, type ActionConfig } from "./shared";

type PricingVariant =
  | "three-column-highlight"
  | "toggle-contrast"
  | "stacked-showcase"
  | "comparison-table"
  | "tiered-journey"
  | "gradient-panels"
  | "starter-enterprise-split"
  | "usage-meter"
  | "modular-addons"
  | "metrics-driven"
  | "regional-cards"
  | "partner-retainers";

type PricingTier = {
  name: string;
  price?: string;
  period?: string;
  description?: string;
  features?: string[] | { items?: string[] } | null;
  badge?: string;
  highlight?: string;
  footnote?: string;
  icon?: string;
  cta?: ActionConfig | null;
};

type ToggleOption = {
  label?: string;
  description?: string;
  active?: boolean;
};

type MetricItem = {
  label: string;
  value: string;
  caption?: string;
};

type AddOnItem = {
  name: string;
  price?: string;
  description?: string;
  features?: string[] | { items?: string[] } | null;
};

type ComparisonValue = {
  label?: string;
  value?: string;
  included?: boolean;
};

type ComparisonRow = {
  feature: string;
  values?: ComparisonValue[] | { items?: ComparisonValue[] } | null;
};

type FAQItem = {
  question: string;
  answer: string;
};

export interface PricingSectionProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  highlight?: string;
  caption?: string;
  note?: string;
  savingsLabel?: string;
  variant?: PricingVariant;
  tiers?: PricingTier[] | { items?: PricingTier[] } | null;
  toggles?: ToggleOption[] | { items?: ToggleOption[] } | null;
  metrics?: MetricItem[] | { items?: MetricItem[] } | null;
  features?: string[] | { items?: string[] } | null;
  addOns?: AddOnItem[] | { items?: AddOnItem[] } | null;
  comparisons?: ComparisonRow[] | { items?: ComparisonRow[] } | null;
  faqs?: FAQItem[] | { items?: FAQItem[] } | null;
  footnote?: string;
  supportCta?: ActionConfig | null;
  primaryCta?: ActionConfig | null;
  secondaryCta?: ActionConfig | null;
  children?: React.ReactNode;
}

type NormalizedTier = Omit<PricingTier, "features" | "cta"> & {
  features: string[];
  cta: ActionConfig | null;
};

type NormalizedAddOn = Omit<AddOnItem, "features"> & {
  features: string[];
};

type NormalizedComparison = Omit<ComparisonRow, "values"> & {
  values: ComparisonValue[];
};

interface NormalizedPricingProps
  extends Omit<
    PricingSectionProps,
    "tiers" | "toggles" | "metrics" | "features" | "addOns" | "comparisons" | "faqs"
  > {
  tiers: NormalizedTier[];
  toggles: Array<Required<ToggleOption>>;
  metrics: MetricItem[];
  features: string[];
  addOns: NormalizedAddOn[];
  comparisons: NormalizedComparison[];
  faqs: FAQItem[];
}

export function PricingSection(props: PricingSectionProps) {
  const normalized: NormalizedPricingProps = {
    ...props,
    tiers: normalizeList<PricingTier>(props.tiers).map((tier) => ({
      ...tier,
      features: normalizeList<string>(tier?.features),
      cta: tier?.cta ?? null,
    })),
    toggles: normalizeList<ToggleOption>(props.toggles).map((toggle) => ({
      label: toggle?.label ?? "",
      description: toggle?.description ?? "",
      active: Boolean(toggle?.active),
    })),
    metrics: normalizeList<MetricItem>(props.metrics),
    features: normalizeList<string>(props.features),
    addOns: normalizeList<AddOnItem>(props.addOns).map((item) => ({
      ...item,
      features: normalizeList<string>(item?.features),
    })),
    comparisons: normalizeList<ComparisonRow>(props.comparisons).map((row) => ({
      ...row,
      values: normalizeList<ComparisonValue>(row?.values),
    })),
    faqs: normalizeList<FAQItem>(props.faqs),
    primaryCta: props.primaryCta ?? null,
    secondaryCta: props.secondaryCta ?? null,
    supportCta: props.supportCta ?? null,
  };

  switch (normalized.variant ?? "three-column-highlight") {
    case "toggle-contrast":
      return <ToggleContrastPricing {...normalized} />;
    case "stacked-showcase":
      return <StackedShowcasePricing {...normalized} />;
    case "comparison-table":
      return <ComparisonTablePricing {...normalized} />;
    case "tiered-journey":
      return <TieredJourneyPricing {...normalized} />;
    case "gradient-panels":
      return <GradientPanelsPricing {...normalized} />;
    case "starter-enterprise-split":
      return <StarterEnterpriseSplitPricing {...normalized} />;
    case "usage-meter":
      return <UsageMeterPricing {...normalized} />;
    case "modular-addons":
      return <ModularAddOnsPricing {...normalized} />;
    case "metrics-driven":
      return <MetricsDrivenPricing {...normalized} />;
    case "regional-cards":
      return <RegionalCardsPricing {...normalized} />;
    case "partner-retainers":
      return <PartnerRetainersPricing {...normalized} />;
    case "three-column-highlight":
    default:
      return <ThreeColumnHighlightPricing {...normalized} />;
  }
}

function ThreeColumnHighlightPricing(props: NormalizedPricingProps) {
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
        <div className="grid gap-6 lg:grid-cols-3">
          {props.tiers.map((tier, index) => (
            <article
              key={tier.name}
              className={cn(
                "relative flex h-full flex-col gap-6 rounded-3xl border border-border/60 bg-muted/40 p-8 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg",
                index === 1 && "border-primary/60 bg-primary/5 shadow-xl"
              )}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">{tier.name}</p>
                    {tier.badge && (
                      <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {tier.badge}
                      </span>
                    )}
                  </div>
                  {tier.highlight && (
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      {tier.highlight}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 text-foreground">
                  {tier.price && <span className="text-4xl font-semibold">{tier.price}</span>}
                  {tier.period && <span className="text-sm text-muted-foreground">/{tier.period}</span>}
                </div>
                {tier.description && <p className="text-sm text-muted-foreground">{tier.description}</p>}
              </div>
              {tier.features.length > 0 && (
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className="mt-1 inline-flex size-2 rounded-full bg-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto flex flex-col gap-3">
                {renderAction(tier.cta ?? props.primaryCta, "primary")}
                {tier.footnote && <p className="text-xs text-muted-foreground">{tier.footnote}</p>}
              </div>
            </article>
          ))}
        </div>
        <div className="flex flex-col items-center gap-4 text-center">
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} className="justify-center" />
          {props.footnote && <p className="text-sm text-muted-foreground">{props.footnote}</p>}
        </div>
      </div>
    </section>
  );
}

function ToggleContrastPricing(props: NormalizedPricingProps) {
  const primary = props.tiers[0];
  const secondary = props.tiers[1];
  const remaining = props.tiers.slice(2);

  return (
    <section className="relative overflow-hidden bg-slate-950 py-24 text-slate-50">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-emerald-400/20" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-8">
        <header className="space-y-6 text-center">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">{props.eyebrow}</p>
          )}
          {props.title && <h2 className="text-4xl font-semibold sm:text-5xl">{props.title}</h2>}
          {props.description && <p className="mx-auto max-w-2xl text-base text-slate-300">{props.description}</p>}
          {props.toggles.length > 0 && (
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 p-2">
              {props.toggles.map((toggle) => (
                <span
                  key={toggle.label}
                  className={cn(
                    "flex min-w-[140px] flex-col rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em]",
                    toggle.active ? "bg-primary text-slate-900" : "text-slate-400"
                  )}
                >
                  {toggle.label}
                  {toggle.description && (
                    <span className="mt-1 text-[10px] font-normal normal-case tracking-normal text-slate-400">
                      {toggle.description}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </header>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {primary && (
            <article className="flex h-full flex-col justify-between gap-8 rounded-3xl border border-slate-700 bg-slate-900/70 p-8 shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{primary.name}</p>
                    {primary.badge && (
                      <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {primary.badge}
                      </span>
                    )}
                  </div>
                  {primary.highlight && (
                    <span className="rounded-full border border-primary/60 px-3 py-1 text-xs font-semibold text-primary">
                      {primary.highlight}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  {primary.price && <span className="text-5xl font-semibold">{primary.price}</span>}
                  {primary.period && <span className="text-sm text-slate-400">/{primary.period}</span>}
                </div>
                {primary.description && <p className="text-sm text-slate-300">{primary.description}</p>}
                {primary.features.length > 0 && (
                  <ul className="space-y-3 text-sm text-slate-300">
                    {primary.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <span className="mt-1 inline-flex size-2 rounded-full bg-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-col gap-3">
                {renderAction(primary.cta ?? props.primaryCta, "primary")}
                {primary.footnote && <p className="text-xs text-slate-400">{primary.footnote}</p>}
              </div>
            </article>
          )}
          <div className="flex flex-col gap-6">
            {secondary && (
              <article className="flex flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{secondary.name}</p>
                  {secondary.highlight && (
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-[11px] font-semibold text-slate-300">
                      {secondary.highlight}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  {secondary.price && <span className="text-4xl font-semibold">{secondary.price}</span>}
                  {secondary.period && <span className="text-xs text-slate-400">/{secondary.period}</span>}
                </div>
                {secondary.description && <p className="text-sm text-slate-300">{secondary.description}</p>}
                {secondary.features.length > 0 && (
                  <ul className="space-y-2 text-sm text-slate-400">
                    {secondary.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="mt-1 inline-flex size-1.5 rounded-full bg-slate-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {renderAction(secondary.cta ?? props.secondaryCta, "ghost")}
              </article>
            )}
            {remaining.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {remaining.map((tier) => (
                  <div key={tier.name} className="rounded-2xl border border-slate-900/60 bg-slate-900/30 p-5">
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">{tier.name}</p>
                      {tier.price && <span className="text-lg font-semibold text-slate-100">{tier.price}</span>}
                    </div>
                    {tier.description && <p className="mt-3 text-xs text-slate-400">{tier.description}</p>}
                    {tier.features.length > 0 && (
                      <ul className="mt-4 space-y-2 text-xs text-slate-400">
                        {tier.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <span className="mt-1 inline-flex size-1 rounded-full bg-primary/60" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {props.footnote && <p className="text-center text-xs text-slate-400">{props.footnote}</p>}
      </div>
    </section>
  );
}

function StackedShowcasePricing(props: NormalizedPricingProps) {
  return (
    <section className="bg-muted/40 py-20">
      <div className="mx-auto w-full max-w-6xl space-y-12 px-4 sm:px-8 lg:space-y-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)] lg:items-start">
          <div className="space-y-6">
            {props.eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">{props.eyebrow}</p>
            )}
            {props.title && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.title}</h2>}
            {props.description && <p className="text-base text-muted-foreground">{props.description}</p>}
            {props.highlight && (
              <div className="rounded-3xl border border-primary/20 bg-primary/10 p-6 text-sm text-primary">
                {props.highlight}
              </div>
            )}
            {props.features.length > 0 && (
              <ul className="space-y-3 text-sm text-muted-foreground">
                {props.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-1 inline-flex size-2 rounded-full bg-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            )}
            <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
            {props.footnote && <p className="text-xs text-muted-foreground">{props.footnote}</p>}
          </div>
          <div className="relative grid gap-8">
            {props.tiers.map((tier, index) => (
              <article
                key={tier.name}
                className={cn(
                  "relative flex flex-col gap-6 rounded-3xl border border-border/50 bg-background/90 p-8 shadow-lg transition", 
                  index === 0 && "lg:-rotate-1 lg:translate-x-2",
                  index === 2 && "lg:rotate-1 lg:-translate-x-2"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">{tier.name}</p>
                    {tier.badge && (
                      <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {tier.badge}
                      </span>
                    )}
                  </div>
                  {tier.price && (
                    <div className="flex items-baseline gap-2 text-foreground">
                      <span className="text-3xl font-semibold">{tier.price}</span>
                      {tier.period && <span className="text-xs text-muted-foreground">/{tier.period}</span>}
                    </div>
                  )}
                </div>
                {tier.description && <p className="text-sm text-muted-foreground">{tier.description}</p>}
                {tier.features.length > 0 && (
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="mt-1 inline-flex size-1.5 rounded-full bg-primary/60" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-3">
                  {renderAction(tier.cta, "primary")}
                  {tier.highlight && (
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                      {tier.highlight}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ComparisonTablePricing(props: NormalizedPricingProps) {
  const columns = props.tiers;

  return (
    <section className="bg-background py-20">
      <div className="mx-auto w-full max-w-6xl space-y-10 px-4 sm:px-8">
        <header className="space-y-4 text-center">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>
          )}
          {props.title && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.title}</h2>}
          {props.description && <p className="mx-auto max-w-3xl text-base text-muted-foreground">{props.description}</p>}
        </header>
        <div className="overflow-hidden rounded-3xl border border-border/60 shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Feature</th>
                {columns.map((column) => (
                  <th key={column.name} className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    <div className="flex flex-col gap-1">
                      <span className="uppercase tracking-[0.25em] text-xs text-muted-foreground">{column.name}</span>
                      {column.price && (
                        <span className="text-lg font-semibold text-foreground">
                          {column.price}
                          {column.period && <span className="text-xs text-muted-foreground">/{column.period}</span>}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.comparisons.map((row) => (
                <tr key={row.feature} className="border-t border-border/50">
                  <td className="px-6 py-4 text-sm text-muted-foreground">{row.feature}</td>
                  {columns.map((_, columnIndex) => {
                    const value = row.values[columnIndex];
                    if (!value) {
                      return (
                        <td key={`${row.feature}-${columnIndex}`} className="px-6 py-4 text-center text-sm text-muted-foreground">
                          —
                        </td>
                      );
                    }
                    return (
                      <td key={`${row.feature}-${columnIndex}`} className="px-6 py-4 text-sm text-foreground">
                        {value.included ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            ✓ Included
                          </span>
                        ) : value.value ? (
                          <span>{value.value}</span>
                        ) : (
                          <span className="text-muted-foreground">{value.label ?? "—"}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col items-center gap-4 text-center">
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} className="justify-center" />
          {props.footnote && <p className="text-xs text-muted-foreground">{props.footnote}</p>}
        </div>
      </div>
    </section>
  );
}

function TieredJourneyPricing(props: NormalizedPricingProps) {
  return (
    <section className="bg-gradient-to-b from-background via-background to-muted/40 py-24">
      <div className="mx-auto w-full max-w-5xl space-y-12 px-4 sm:px-8">
        <header className="space-y-4 text-center">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">{props.eyebrow}</p>
          )}
          {props.title && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.title}</h2>}
          {props.description && <p className="mx-auto max-w-3xl text-base text-muted-foreground">{props.description}</p>}
        </header>
        <ol className="relative space-y-8 border-l border-border/60 pl-6">
          {props.tiers.map((tier, index) => (
            <li key={tier.name} className="space-y-4">
              <div className="absolute -left-[14px] mt-2 flex size-7 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </div>
              <div className="rounded-3xl border border-border/50 bg-background p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">{tier.name}</p>
                    {tier.highlight && (
                      <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {tier.highlight}
                      </span>
                    )}
                  </div>
                  {tier.price && (
                    <div className="flex items-baseline gap-1 text-foreground">
                      <span className="text-3xl font-semibold">{tier.price}</span>
                      {tier.period && <span className="text-xs text-muted-foreground">/{tier.period}</span>}
                    </div>
                  )}
                </div>
                {tier.description && <p className="mt-4 text-sm text-muted-foreground">{tier.description}</p>}
                {tier.features.length > 0 && (
                  <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="mt-1 inline-flex size-1.5 rounded-full bg-primary/60" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {renderAction(tier.cta, "primary")}
                  {tier.footnote && <span className="text-xs text-muted-foreground">{tier.footnote}</span>}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-col items-center gap-4 text-center">
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} className="justify-center" />
          {props.footnote && <p className="text-sm text-muted-foreground">{props.footnote}</p>}
        </div>
      </div>
    </section>
  );
}

function GradientPanelsPricing(props: NormalizedPricingProps) {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-purple-500/20" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-8">
        <header className="mx-auto max-w-3xl space-y-4 text-center">
          {props.eyebrow && (
            <span className="inline-flex items-center justify-center rounded-full border border-primary/40 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              {props.eyebrow}
            </span>
          )}
          {props.title && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.title}</h2>}
          {props.description && <p className="text-base text-muted-foreground">{props.description}</p>}
        </header>
        <div className="grid gap-6 lg:grid-cols-3">
          {props.tiers.map((tier, index) => (
            <article
              key={tier.name}
              className={cn(
                "relative flex h-full flex-col gap-6 overflow-hidden rounded-3xl border border-border/40 bg-background/90 p-8 shadow-xl backdrop-blur",
                index === 1 && "border-primary/50"
              )}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-primary/60" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">{tier.name}</p>
                  {tier.highlight && (
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      {tier.highlight}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  {tier.price && <span className="text-4xl font-semibold text-foreground">{tier.price}</span>}
                  {tier.period && <span className="text-xs text-muted-foreground">/{tier.period}</span>}
                </div>
                {tier.description && <p className="text-sm text-muted-foreground">{tier.description}</p>}
              </div>
              {tier.features.length > 0 && (
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 inline-flex size-1.5 rounded-full bg-primary/60" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto flex flex-col gap-3">
                {renderAction(tier.cta, "primary")}
                {tier.footnote && <p className="text-xs text-muted-foreground">{tier.footnote}</p>}
              </div>
            </article>
          ))}
        </div>
        {props.footnote && <p className="text-center text-xs text-muted-foreground">{props.footnote}</p>}
      </div>
    </section>
  );
}

function StarterEnterpriseSplitPricing(props: NormalizedPricingProps) {
  const primary = props.tiers[0];
  const enterprise = props.tiers[1];
  const strategic = props.tiers[2];

  return (
    <section className="bg-background py-20">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="space-y-6">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>
          )}
          {props.title && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.title}</h2>}
          {props.description && <p className="text-base text-muted-foreground">{props.description}</p>}
          {props.highlight && (
            <div className="rounded-3xl border border-emerald-400/40 bg-emerald-100/30 p-6 text-sm text-emerald-700">
              {props.highlight}
            </div>
          )}
          {props.features.length > 0 && (
            <ul className="space-y-3 text-sm text-muted-foreground">
              {props.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex size-2 rounded-full bg-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          )}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
          {props.footnote && <p className="text-xs text-muted-foreground">{props.footnote}</p>}
        </div>
        <div className="space-y-6">
          {primary && (
            <article className="rounded-3xl border border-border/60 bg-muted/30 p-8 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">{primary.name}</p>
                  {primary.badge && (
                    <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {primary.badge}
                    </span>
                  )}
                </div>
                {primary.price && (
                  <div className="flex items-baseline gap-1 text-foreground">
                    <span className="text-3xl font-semibold">{primary.price}</span>
                    {primary.period && <span className="text-xs text-muted-foreground">/{primary.period}</span>}
                  </div>
                )}
              </div>
              {primary.description && <p className="mt-4 text-sm text-muted-foreground">{primary.description}</p>}
              {primary.features.length > 0 && (
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {primary.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 inline-flex size-1.5 rounded-full bg-primary/60" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {renderAction(primary.cta, "primary")}
                {primary.footnote && <span className="text-xs text-muted-foreground">{primary.footnote}</span>}
              </div>
            </article>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            {enterprise && (
              <article className="flex h-full flex-col gap-4 rounded-3xl border border-primary/30 bg-primary/5 p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">{enterprise.name}</p>
                  {enterprise.highlight && (
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      {enterprise.highlight}
                    </span>
                  )}
                </div>
                {enterprise.price && (
                  <div className="flex items-baseline gap-1 text-foreground">
                    <span className="text-2xl font-semibold">{enterprise.price}</span>
                    {enterprise.period && <span className="text-xs text-muted-foreground">/{enterprise.period}</span>}
                  </div>
                )}
                {enterprise.description && <p className="text-sm text-muted-foreground">{enterprise.description}</p>}
                {enterprise.features.length > 0 && (
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {enterprise.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="mt-1 inline-flex size-1 rounded-full bg-primary/60" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {renderAction(enterprise.cta ?? props.secondaryCta, "ghost")}
              </article>
            )}
            {strategic && (
              <article className="flex h-full flex-col gap-4 rounded-3xl border border-border/60 bg-background p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">{strategic.name}</p>
                {strategic.price && <p className="text-2xl font-semibold text-foreground">{strategic.price}</p>}
                {strategic.description && <p className="text-sm text-muted-foreground">{strategic.description}</p>}
                {strategic.features.length > 0 && (
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {strategic.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="mt-1 inline-flex size-1 rounded-full bg-muted-foreground" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {renderAction(strategic.cta ?? props.supportCta, "secondary")}
              </article>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function UsageMeterPricing(props: NormalizedPricingProps) {
  const highlightTier = props.tiers[0];

  return (
    <section className="bg-slate-950 py-24 text-slate-100">
      <div className="mx-auto w-full max-w-5xl space-y-12 px-4 sm:px-8">
        <header className="space-y-4 text-center">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-400">{props.eyebrow}</p>
          )}
          {props.title && <h2 className="text-4xl font-semibold sm:text-5xl">{props.title}</h2>}
          {props.description && <p className="mx-auto max-w-2xl text-base text-slate-300">{props.description}</p>}
        </header>
        {highlightTier && (
          <article className="rounded-3xl border border-slate-800 bg-slate-900/60 p-10 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">{highlightTier.name}</p>
                <div className="flex items-baseline gap-3">
                  {highlightTier.price && <span className="text-5xl font-semibold">{highlightTier.price}</span>}
                  {highlightTier.period && <span className="text-sm text-slate-400">/{highlightTier.period}</span>}
                </div>
                {highlightTier.description && <p className="text-sm text-slate-300">{highlightTier.description}</p>}
              </div>
              <div className="w-full max-w-xs">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
                  <span>Usage</span>
                  <span>Capacity</span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: "68%" }} />
                </div>
                {props.highlight && <p className="mt-3 text-xs text-emerald-300">{props.highlight}</p>}
              </div>
            </div>
            {highlightTier.features.length > 0 && (
              <ul className="mt-8 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                {highlightTier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-1 inline-flex size-2 rounded-full bg-emerald-400" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {renderAction(highlightTier.cta ?? props.primaryCta, "primary")}
              {highlightTier.footnote && <span className="text-xs text-slate-400">{highlightTier.footnote}</span>}
            </div>
          </article>
        )}
        {props.metrics.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-3">
            {props.metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{metric.label}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-100">{metric.value}</p>
                {metric.caption && <p className="mt-2 text-xs text-slate-400">{metric.caption}</p>}
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col items-center gap-3 text-center">
          {props.secondaryCta && renderAction(props.secondaryCta, "ghost")}
          {props.footnote && <p className="text-xs text-slate-400">{props.footnote}</p>}
        </div>
      </div>
    </section>
  );
}

function ModularAddOnsPricing(props: NormalizedPricingProps) {
  const base = props.tiers[0];

  return (
    <section className="bg-background py-20">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="space-y-6">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>
          )}
          {props.title && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.title}</h2>}
          {props.description && <p className="text-base text-muted-foreground">{props.description}</p>}
          {props.note && <p className="text-sm text-muted-foreground">{props.note}</p>}
          <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
        </div>
        <div className="space-y-6">
          {base && (
            <article className="rounded-3xl border border-primary/40 bg-primary/10 p-8">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">{base.name}</p>
                {base.price && (
                  <span className="text-3xl font-semibold text-primary/90">
                    {base.price}
                    {base.period && <span className="text-xs text-primary/70">/{base.period}</span>}
                  </span>
                )}
              </div>
              {base.description && <p className="mt-4 text-sm text-primary/80">{base.description}</p>}
              {base.features.length > 0 && (
                <ul className="mt-4 space-y-2 text-sm text-primary/80">
                  {base.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 inline-flex size-1.5 rounded-full bg-primary/70" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {renderAction(base.cta ?? props.primaryCta, "primary")}
                {base.footnote && <span className="text-xs text-primary/70">{base.footnote}</span>}
              </div>
            </article>
          )}
          {props.addOns.length > 0 && (
            <div className="rounded-3xl border border-border/60 bg-muted/30 p-8">
              <h3 className="text-lg font-semibold text-foreground">Modular add-ons</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick only the accelerators your team needs. Each add-on can be activated or paused at any time.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {props.addOns.map((addOn) => (
                  <div key={addOn.name} className="rounded-2xl border border-border/40 bg-background p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{addOn.name}</p>
                      {addOn.price && <span className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">{addOn.price}</span>}
                    </div>
                    {addOn.description && <p className="mt-2 text-xs text-muted-foreground">{addOn.description}</p>}
                    {addOn.features.length > 0 && (
                      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                        {addOn.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <span className="mt-1 inline-flex size-1 rounded-full bg-primary/50" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {props.footnote && <p className="text-xs text-muted-foreground">{props.footnote}</p>}
        </div>
      </div>
    </section>
  );
}

function MetricsDrivenPricing(props: NormalizedPricingProps) {
  return (
    <section className="bg-muted/30 py-20">
      <div className="mx-auto w-full max-w-6xl space-y-12 px-4 sm:px-8">
        <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
          <div className="space-y-4">
            {props.eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">{props.eyebrow}</p>
            )}
            {props.title && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.title}</h2>}
            {props.description && <p className="text-base text-muted-foreground">{props.description}</p>}
            <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
          </div>
          {props.metrics.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {props.metrics.map((metric) => (
                <div key={metric.label} className="rounded-3xl border border-border/60 bg-background p-6 text-center shadow-sm">
                  <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">{metric.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">{metric.value}</p>
                  {metric.caption && <p className="mt-2 text-xs text-muted-foreground">{metric.caption}</p>}
                </div>
              ))}
            </div>
          )}
        </header>
        <div className="grid gap-6 lg:grid-cols-3">
          {props.tiers.map((tier) => (
            <article key={tier.name} className="flex h-full flex-col gap-6 rounded-3xl border border-border/60 bg-background p-8 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">{tier.name}</p>
                  {tier.badge && (
                    <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {tier.badge}
                    </span>
                  )}
                </div>
                {tier.price && (
                  <div className="flex items-baseline gap-1 text-foreground">
                    <span className="text-3xl font-semibold">{tier.price}</span>
                    {tier.period && <span className="text-xs text-muted-foreground">/{tier.period}</span>}
                  </div>
                )}
              </div>
              {tier.description && <p className="text-sm text-muted-foreground">{tier.description}</p>}
              {tier.features.length > 0 && (
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 inline-flex size-1.5 rounded-full bg-primary/60" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto flex flex-col gap-3">
                {renderAction(tier.cta, "primary")}
                {tier.footnote && <p className="text-xs text-muted-foreground">{tier.footnote}</p>}
              </div>
            </article>
          ))}
        </div>
        {props.footnote && <p className="text-center text-xs text-muted-foreground">{props.footnote}</p>}
      </div>
    </section>
  );
}

function RegionalCardsPricing(props: NormalizedPricingProps) {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto w-full max-w-6xl space-y-12 px-4 sm:px-8">
        <header className="space-y-4 text-center">
          {props.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>
          )}
          {props.title && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.title}</h2>}
          {props.description && <p className="mx-auto max-w-3xl text-base text-muted-foreground">{props.description}</p>}
        </header>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {props.tiers.map((tier) => (
            <article key={tier.name} className="flex h-full flex-col gap-6 rounded-3xl border border-border/60 bg-muted/30 p-8">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">{tier.name}</p>
                  {tier.badge && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{tier.badge}</span>
                  )}
                </div>
                {tier.price && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold text-foreground">{tier.price}</span>
                    {tier.period && <span className="text-xs text-muted-foreground">/{tier.period}</span>}
                  </div>
                )}
                {tier.description && <p className="text-sm text-muted-foreground">{tier.description}</p>}
              </div>
              {tier.features.length > 0 && (
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 inline-flex size-1.5 rounded-full bg-primary/60" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-3">
                {renderAction(tier.cta, "primary")}
                {tier.footnote && <span className="text-xs text-muted-foreground">{tier.footnote}</span>}
              </div>
            </article>
          ))}
        </div>
        {props.footnote && <p className="text-center text-xs text-muted-foreground">{props.footnote}</p>}
      </div>
    </section>
  );
}

function PartnerRetainersPricing(props: NormalizedPricingProps) {
  return (
    <section className="bg-muted/20 py-20">
      <div className="mx-auto w-full max-w-6xl space-y-12 px-4 sm:px-8">
        <header className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
          <div className="space-y-4">
            {props.eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>
            )}
            {props.title && <h2 className="text-4xl font-semibold text-foreground sm:text-5xl">{props.title}</h2>}
            {props.description && <p className="text-base text-muted-foreground">{props.description}</p>}
            {props.highlight && (
              <div className="rounded-3xl border border-primary/20 bg-primary/10 p-6 text-sm text-primary">{props.highlight}</div>
            )}
            <ActionsRow primary={props.primaryCta} secondary={props.secondaryCta} />
          </div>
          <div className="space-y-4 rounded-3xl border border-border/60 bg-background p-8 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Why teams choose retainers</h3>
            {props.features.length > 0 && (
              <ul className="space-y-3 text-sm text-muted-foreground">
                {props.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-1 inline-flex size-2 rounded-full bg-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            )}
            {props.supportCta && (
              <div className="pt-2">{renderAction(props.supportCta, "secondary")}</div>
            )}
          </div>
        </header>
        <div className="grid gap-6 lg:grid-cols-3">
          {props.tiers.map((tier) => (
            <article key={tier.name} className="flex h-full flex-col gap-6 rounded-3xl border border-border/60 bg-background p-8 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">{tier.name}</p>
                  {tier.badge && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{tier.badge}</span>
                  )}
                </div>
                {tier.price && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold text-foreground">{tier.price}</span>
                    {tier.period && <span className="text-xs text-muted-foreground">/{tier.period}</span>}
                  </div>
                )}
                {tier.description && <p className="text-sm text-muted-foreground">{tier.description}</p>}
              </div>
              {tier.features.length > 0 && (
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 inline-flex size-1.5 rounded-full bg-primary/60" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto flex flex-col gap-3">
                {renderAction(tier.cta, "primary")}
                {tier.footnote && <p className="text-xs text-muted-foreground">{tier.footnote}</p>}
              </div>
            </article>
          ))}
        </div>
        {props.faqs.length > 0 && (
          <div className="grid gap-4 rounded-3xl border border-border/60 bg-background p-8 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Frequently asked</h3>
            <dl className="space-y-4">
              {props.faqs.map((faq) => (
                <div key={faq.question}>
                  <dt className="text-sm font-semibold text-foreground">{faq.question}</dt>
                  <dd className="mt-2 text-sm text-muted-foreground">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        {props.footnote && <p className="text-center text-xs text-muted-foreground">{props.footnote}</p>}
      </div>
    </section>
  );
}

