import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { normalizeList } from "../shared";

export type MetricTrend = "up" | "down" | "flat";

export interface MetricCard {
  id?: string | null;
  label: string;
  value: string;
  change?: string | null;
  changeLabel?: string | null;
  trend?: MetricTrend | null;
  description?: string | null;
  icon?: string | null;
  tone?: "positive" | "negative" | "neutral" | "informative" | null;
}

export interface AdminMetricCardsProps {
  title?: string;
  description?: string;
  metrics?: MetricCard[] | { items?: MetricCard[] } | null;
  columns?: number | null;
  layout?: "grid" | "carousel" | null;
  footnote?: string | null;
}

const trendStyles: Record<Exclude<MetricTrend, "flat">, string> = {
  up: "text-emerald-600",
  down: "text-destructive",
};

const toneBadgeMap: Record<string, string> = {
  positive: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  negative: "bg-destructive/10 text-destructive border-destructive/30",
  informative: "bg-sky-500/10 text-sky-600 border-sky-500/30",
  neutral: "bg-muted text-muted-foreground border-border/60",
};

export function AdminMetricCards(props: AdminMetricCardsProps) {
  const cards = normalizeList<MetricCard>(props.metrics);
  const columns = props.columns ?? (cards.length >= 3 ? 3 : cards.length || 1);

  return (
    <section className="space-y-6">
      {(props.title || props.description) && (
        <header className="space-y-2">
          {props.title && <h2 className="text-xl font-semibold text-foreground">{props.title}</h2>}
          {props.description && <p className="text-sm text-muted-foreground">{props.description}</p>}
        </header>
      )}
      <div
        className={cn(
          "grid gap-4",
          columns === 1 && "sm:grid-cols-1",
          columns === 2 && "sm:grid-cols-2",
          columns >= 3 && "md:grid-cols-3",
          columns >= 4 && "xl:grid-cols-4"
        )}
      >
        {cards.map((metric) => (
          <Card key={metric.id ?? metric.label} className="border-border/60">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base font-medium text-muted-foreground">
                  <span className="flex items-center gap-2">
                    {metric.icon && <span aria-hidden>{metric.icon}</span>}
                    <span>{metric.label}</span>
                  </span>
                </CardTitle>
                {metric.tone && (
                  <Badge
                    variant="outline"
                    className={cn("border", toneBadgeMap[metric.tone] ?? toneBadgeMap.neutral)}
                  >
                    {metric.tone === "positive" && "On track"}
                    {metric.tone === "negative" && "Needs care"}
                    {metric.tone === "informative" && "Insight"}
                    {metric.tone === "neutral" && "Update"}
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-semibold tracking-tight text-foreground">{metric.value}</p>
                {(metric.change || metric.changeLabel) && (
                  <p
                    className={cn(
                      "text-xs font-medium",
                      metric.trend && metric.trend !== "flat"
                        ? trendStyles[metric.trend]
                        : "text-muted-foreground"
                    )}
                  >
                    {metric.change}
                    {metric.changeLabel ? ` · ${metric.changeLabel}` : null}
                  </p>
                )}
              </div>
            </CardHeader>
            {(metric.description || metric.trend === "flat") && (
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {metric.description ?? "Holding steady with no major changes this month."}
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
      {props.footnote && <p className="text-xs text-muted-foreground/80">{props.footnote}</p>}
    </section>
  );
}
