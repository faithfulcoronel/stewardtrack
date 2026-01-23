"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus, Sparkles, AlertCircle, Info, Activity } from "lucide-react";

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

const trendConfig: Record<MetricTrend, { icon: React.ReactNode; className: string }> = {
  up: {
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  down: {
    icon: <TrendingDown className="h-3.5 w-3.5" />,
    className: "text-rose-600 dark:text-rose-400",
  },
  flat: {
    icon: <Minus className="h-3.5 w-3.5" />,
    className: "text-muted-foreground",
  },
};

const toneConfig: Record<string, { icon: React.ReactNode; label: string; className: string; bgClassName: string }> = {
  positive: {
    icon: <Sparkles className="h-3 w-3" />,
    label: "On track",
    className: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    bgClassName: "bg-emerald-500/10",
  },
  negative: {
    icon: <AlertCircle className="h-3 w-3" />,
    label: "Needs care",
    className: "text-rose-600 dark:text-rose-400 border-rose-500/30",
    bgClassName: "bg-rose-500/10",
  },
  informative: {
    icon: <Info className="h-3 w-3" />,
    label: "Insight",
    className: "text-sky-600 dark:text-sky-400 border-sky-500/30",
    bgClassName: "bg-sky-500/10",
  },
  neutral: {
    icon: <Activity className="h-3 w-3" />,
    label: "Update",
    className: "text-muted-foreground border-border/60",
    bgClassName: "bg-muted/50",
  },
};

export function AdminMetricCards(props: AdminMetricCardsProps) {
  const cards = normalizeList<MetricCard>(props.metrics);
  const columns = props.columns ?? (cards.length >= 3 ? 3 : cards.length || 1);

  return (
    <section className="space-y-5 sm:space-y-6">
      {(props.title || props.description) && (
        <header className="space-y-1.5 sm:space-y-2">
          {props.title && (
            <h2 className="text-lg sm:text-xl font-semibold text-foreground flex items-center gap-2">
              <span className="h-5 w-1 rounded-full bg-primary" />
              {props.title}
            </h2>
          )}
          {props.description && (
            <p className="text-sm text-muted-foreground pl-3">{props.description}</p>
          )}
        </header>
      )}

      <div
        className={cn(
          "grid gap-3 sm:gap-4",
          columns === 1 && "grid-cols-1",
          columns === 2 && "grid-cols-1 sm:grid-cols-2",
          columns >= 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
          columns >= 4 && "xl:grid-cols-4"
        )}
      >
        {cards.map((metric, index) => {
          const trendInfo = metric.trend ? trendConfig[metric.trend] : null;
          const toneInfo = metric.tone ? toneConfig[metric.tone] : null;

          return (
            <Card
              key={metric.id ?? metric.label}
              className={cn(
                "group relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm",
                "transition-all duration-300",
                "hover:border-border hover:shadow-lg hover:shadow-primary/5",
                "active:scale-[0.99]"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Top accent line */}
              <div className={cn(
                "absolute top-0 left-0 right-0 h-0.5",
                toneInfo ? toneInfo.bgClassName : "bg-primary/30"
              )} />

              <CardHeader className="relative space-y-3 pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    <span className="flex items-center gap-2">
                      {metric.icon && (
                        <span
                          className="text-base"
                          aria-hidden
                        >
                          {metric.icon}
                        </span>
                      )}
                      <span>{metric.label}</span>
                    </span>
                  </CardTitle>

                  {toneInfo && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "border text-[10px] sm:text-xs font-medium py-0.5 px-2",
                        toneInfo.className,
                        toneInfo.bgClassName
                      )}
                    >
                      <span className="mr-1">{toneInfo.icon}</span>
                      <span className="hidden sm:inline">{toneInfo.label}</span>
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="relative space-y-3 pt-0">
                {/* Main value */}
                <div className="space-y-1">
                  <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {metric.value}
                  </p>

                  {/* Change indicator */}
                  {(metric.change || metric.changeLabel) && (
                    <div
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-medium",
                        trendInfo ? trendInfo.className : "text-muted-foreground"
                      )}
                    >
                      {trendInfo && trendInfo.icon}
                      <span>{metric.change}</span>
                      {metric.changeLabel && (
                        <>
                          <span className="text-muted-foreground/60">·</span>
                          <span className="text-muted-foreground">{metric.changeLabel}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Description */}
                {(metric.description || metric.trend === "flat") && (
                  <div className="pt-2 border-t border-border/40">
                    <p className="text-xs sm:text-sm text-muted-foreground/80 leading-relaxed">
                      {metric.description ?? "Holding steady with no major changes this period."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {props.footnote && (
        <p className="text-xs text-muted-foreground/70 flex items-center gap-2">
          <Info className="h-3 w-3" />
          {props.footnote}
        </p>
      )}
    </section>
  );
}
