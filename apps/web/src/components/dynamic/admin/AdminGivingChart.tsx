"use client";

import React from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { normalizeList } from "../shared";

export interface GivingPoint {
  period: string;
  pledged?: number | null;
  received?: number | null;
  participation?: number | null;
}

export interface AdminGivingChartProps {
  title?: string;
  description?: string;
  data?: GivingPoint[] | { items?: GivingPoint[] } | null;
  highlight?: { label?: string; value?: string; change?: string } | null;
  currency?: string;
}

export function AdminGivingChart(props: AdminGivingChartProps) {
  const data = normalizeList<GivingPoint>(props.data);
  const currency = props.currency || "PHP";
  const hasData = data.length > 0;

  return (
    <section className="space-y-5 sm:space-y-6">
      <Card className={cn(
        "group relative overflow-hidden",
        "border-border/40 bg-card/50 backdrop-blur-sm",
        "transition-all duration-300",
        "hover:border-border hover:shadow-lg hover:shadow-primary/5"
      )}>
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20 group-hover:bg-primary/40 transition-colors" />

        <CardHeader className="relative flex flex-col gap-4 pb-2 sm:pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1.5 sm:space-y-2 min-w-0 flex-1">
            {props.title && (
              <CardTitle className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-primary shrink-0" />
                <span className="truncate">{props.title}</span>
              </CardTitle>
            )}
            {props.description && (
              <p className="text-xs sm:text-sm text-muted-foreground pl-3 line-clamp-2">{props.description}</p>
            )}
          </div>

          {props.highlight && props.highlight.value && (
            <div className={cn(
              "flex items-center gap-2 sm:gap-3 shrink-0",
              "rounded-xl sm:rounded-2xl border border-primary/30",
              "bg-gradient-to-r from-primary/10 to-primary/5",
              "px-3 sm:px-4 py-2 sm:py-2.5"
            )}>
              <Badge
                variant="outline"
                className="border-primary/40 bg-primary/10 text-[10px] sm:text-xs uppercase tracking-wide text-primary font-medium"
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                {props.highlight.label ?? "Year-to-date"}
              </Badge>
              <span className="text-base sm:text-lg font-bold text-primary tabular-nums">
                {props.highlight.value}
              </span>
              {props.highlight.change && (
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {props.highlight.change}
                </span>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="relative h-72 sm:h-80 w-full pt-0">
          {!hasData ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 shadow-inner mb-4">
                <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground/60" aria-hidden />
              </div>
              <p className="text-sm text-muted-foreground">
                No giving data available for this period.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="pledgedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="receivedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="participationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
                <XAxis
                  dataKey="period"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCurrency(Number(value), currency)}
                  width={70}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) {
                      return null;
                    }
                    return (
                      <div className={cn(
                        "min-w-[180px] rounded-xl border border-border/60",
                        "bg-background/95 backdrop-blur-sm",
                        "p-3 text-xs shadow-xl"
                      )}>
                        <p className="font-semibold text-foreground mb-2 pb-2 border-b border-border/40">
                          {label}
                        </p>
                        {payload.map((entry) => (
                          <p key={entry.dataKey as string} className="flex items-center justify-between gap-3 py-0.5">
                            <span className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-muted-foreground">{String(entry.name)}</span>
                            </span>
                            <span className="font-medium text-foreground tabular-nums">
                              {entry.dataKey === "participation"
                                ? `${Number(entry.value ?? 0).toFixed(0)}%`
                                : formatCurrency(Number(entry.value ?? 0), currency)}
                            </span>
                          </p>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ paddingBottom: '8px' }}
                />
                <Area
                  type="monotone"
                  dataKey="pledged"
                  name="Pledged"
                  stroke="var(--chart-1)"
                  fill="url(#pledgedGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="received"
                  name="Received"
                  stroke="var(--chart-2)"
                  fill="url(#receivedGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="participation"
                  name="Participation %"
                  stroke="var(--chart-3)"
                  fill="url(#participationGradient)"
                  strokeWidth={2}
                  yAxisId={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function formatCurrency(value: number, currencyCode: string = "PHP"): string {
  if (Number.isNaN(value)) {
    return currencyCode === "PHP" ? "$0" : `0 ${currencyCode}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}
