'use client';

/**
 * Admin Report Charts Section
 *
 * Unified component for rendering report charts
 * Supports multiple chart types with dynamic configuration
 */

import React from 'react';
import {
  AdminBarChart,
  AdminLineChart,
  AdminPieChart,
  AdminMultiBarChart,
  AdminStatCard,
  type ChartConfig,
} from './AdminReportCharts';

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
  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header */}
      {(title || description) && (
        <div className="space-y-2">
          {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
      )}

      {/* Stat Cards */}
      {stats.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat, index) => (
            <AdminStatCard
              key={index}
              title={stat.title}
              value={stat.value}
              subtitle={stat.subtitle}
              trend={stat.trend}
            />
          ))}
        </div>
      )}

      {/* Charts */}
      {charts.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {charts.map((chart, index) => {
            const key = `chart-${index}`;
            const commonProps = {
              title: chart.title,
              description: chart.description,
              data: chart.data,
              ...chart.config,
            };

            switch (chart.type) {
              case 'bar':
                return <AdminBarChart key={key} {...commonProps} />;
              case 'line':
                return <AdminLineChart key={key} {...commonProps} />;
              case 'pie':
                return <AdminPieChart key={key} {...commonProps} />;
              case 'multibar':
                return <AdminMultiBarChart key={key} {...commonProps} />;
              default:
                return null;
            }
          })}
        </div>
      )}
    </div>
  );
}
