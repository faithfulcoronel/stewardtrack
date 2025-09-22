"use client";

import React from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
}

export function AdminGivingChart(props: AdminGivingChartProps) {
  const data = normalizeList<GivingPoint>(props.data);

  return (
    <section className="space-y-6">
      <Card className="border-border/60">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            {props.title && <CardTitle className="text-lg font-semibold text-foreground">{props.title}</CardTitle>}
            {props.description && <p className="text-sm text-muted-foreground">{props.description}</p>}
          </div>
          {props.highlight && props.highlight.value && (
            <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/5 px-4 py-2">
              <Badge variant="outline" className="border-primary/40 text-xs uppercase tracking-widest text-primary">
                {props.highlight.label ?? "Year-to-date"}
              </Badge>
              <span className="text-lg font-semibold text-primary">{props.highlight.value}</span>
              {props.highlight.change && (
                <span className="text-sm text-muted-foreground">{props.highlight.change}</span>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" className="stroke-border/40" />
              <XAxis dataKey="period" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(Number(value))}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) {
                    return null;
                  }
                  return (
                    <div className="min-w-[180px] rounded-lg border border-border/60 bg-background/95 p-3 text-xs shadow-lg">
                      <p className="font-semibold text-foreground">{label}</p>
                      {payload.map((entry) => (
                        <p key={entry.dataKey as string} className="mt-1 flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">{String(entry.name)}</span>
                          <span className="font-medium text-foreground">
                            {entry.dataKey === "participation"
                              ? `${Number(entry.value ?? 0).toFixed(0)}%`
                              : formatCurrency(Number(entry.value ?? 0))}
                          </span>
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend verticalAlign="top" height={32} iconType="circle" />
              <Area
                type="monotone"
                dataKey="pledged"
                name="Pledged"
                stroke="var(--chart-1)"
                fill="var(--chart-1)"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="received"
                name="Received"
                stroke="var(--chart-2)"
                fill="var(--chart-2)"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="participation"
                name="Participation %"
                stroke="var(--chart-3)"
                fill="var(--chart-3)"
                fillOpacity={0.15}
                strokeWidth={2}
                yAxisId={0}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </section>
  );
}

function formatCurrency(value: number): string {
  if (Number.isNaN(value)) {
    return "$0";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}
