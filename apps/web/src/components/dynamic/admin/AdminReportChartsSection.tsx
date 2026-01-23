'use client';

/**
 * Admin Report Charts Section
 *
 * Unified component for rendering report charts
 * Supports multiple chart types with dynamic configuration
 */

import React from 'react';
import { BarChart3 } from 'lucide-react';
import {
  AdminBarChart,
  AdminLineChart,
  AdminPieChart,
  AdminMultiBarChart,
  AdminStatCard,
  type ChartConfig,
  type BarChartProps,
  type LineChartProps,
  type PieChartProps,
  type MultiBarChartProps,
} from './AdminReportCharts';
import { cn } from '@/lib/utils';

export interface AdminReportChartsSectionProps {
  title?: string;
  description?: string;
  charts?: ChartConfig[];
  stats?: Array<{
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: {
      value: number;
      isPositive: boolean;
      label: string;
    };
  }>;
  className?: string;
}

export function AdminReportChartsSection({
  title,
  description,
  charts = [],
  stats = [],
  className,
}: AdminReportChartsSectionProps) {
  const hasContent = stats.length > 0 || charts.length > 0;

  return (
    <section className={cn("space-y-5 sm:space-y-6", className)}>
      {/* Header */}
      {(title || description) && (
        <header className="space-y-1.5 sm:space-y-2">
          {title && (
            <h2 className="text-lg sm:text-xl font-semibold text-foreground flex items-center gap-2">
              <span className="h-5 w-1 rounded-full bg-primary" />
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-muted-foreground pl-3">{description}</p>
          )}
        </header>
      )}

      {/* Empty State */}
      {!hasContent && (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 sm:p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 shadow-inner">
              <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground/60" aria-hidden />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">No chart data</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Charts and statistics will appear here once data is available.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      {stats.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat, index) => (
            <div
              key={index}
              style={{ animationDelay: `${index * 50}ms` }}
              className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
            >
              <AdminStatCard
                title={stat.title}
                value={stat.value}
                subtitle={stat.subtitle}
                trend={stat.trend}
              />
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      {charts.length > 0 && (
        <div className={cn(
          "grid gap-4 sm:gap-6",
          charts.length === 1 && "grid-cols-1",
          charts.length >= 2 && "grid-cols-1 lg:grid-cols-2"
        )}>
          {charts.map((chart, index) => {
            const key = `chart-${chart.title || index}`;
            const commonProps = {
              title: chart.title,
              description: chart.description,
              data: chart.data,
              ...chart.config,
            };

            const chartElement = (() => {
              switch (chart.type) {
                case 'bar':
                  return <AdminBarChart {...commonProps} {...(chart.config as BarChartProps)} />;
                case 'line':
                  return <AdminLineChart {...commonProps} {...(chart.config as LineChartProps)} />;
                case 'pie':
                  return <AdminPieChart {...commonProps} {...(chart.config as PieChartProps)} />;
                case 'multibar':
                  return <AdminMultiBarChart {...commonProps} {...(chart.config as MultiBarChartProps)} />;
                default:
                  return null;
              }
            })();

            if (!chartElement) return null;

            return (
              <div
                key={key}
                style={{ animationDelay: `${(stats.length + index) * 50}ms` }}
                className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
              >
                {chartElement}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
