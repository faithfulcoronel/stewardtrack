'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

interface ChartDataPoint {
  [key: string]: string | number;
}

interface BaseChartProps {
  title?: string;
  description?: string;
  data: ChartDataPoint[];
  className?: string;
  height?: number;
}

export interface BarChartProps extends BaseChartProps {
  xKey: string;
  yKey: string;
  xLabel?: string;
  yLabel?: string;
  color?: string;
}

export interface LineChartProps extends BaseChartProps {
  xKey: string;
  yKey: string;
  xLabel?: string;
  yLabel?: string;
  color?: string;
  showPoints?: boolean;
}

export interface PieChartProps extends BaseChartProps {
  nameKey: string;
  valueKey: string;
  showLegend?: boolean;
  showPercentage?: boolean;
}

export interface MultiBarChartProps extends BaseChartProps {
  xKey: string;
  bars: Array<{
    key: string;
    name: string;
    color: string;
  }>;
  xLabel?: string;
  yLabel?: string;
}

// =====================================================
// THEME-AWARE COLORS
// =====================================================

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  success: 'hsl(142.1 76.2% 36.3%)',
  warning: 'hsl(38 92% 50%)',
  danger: 'hsl(var(--destructive))',
  info: 'hsl(199 89% 48%)',
  purple: 'hsl(280 87% 65%)',
  pink: 'hsl(336 84% 65%)',
  orange: 'hsl(25 95% 53%)',
  teal: 'hsl(173 80% 40%)',
};

const PIE_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.info,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.purple,
  CHART_COLORS.pink,
  CHART_COLORS.orange,
  CHART_COLORS.teal,
];

// =====================================================
// CUSTOM TOOLTIP
// =====================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
  formatter?: (value: number) => string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, formatter }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-muted-foreground">{entry.name}:</span>
          <span className="text-sm font-medium text-foreground">
            {formatter ? formatter(entry.value) : entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

// =====================================================
// BAR CHART COMPONENT
// =====================================================

export function AdminBarChart({
  title,
  description,
  data,
  xKey,
  yKey,
  xLabel,
  yLabel,
  color = CHART_COLORS.primary,
  className,
  height = 300,
}: BarChartProps) {
  return (
    <Card className={cn('w-full', className)}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle className="text-lg">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey={xKey}
              label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5 } : undefined}
              className="text-xs fill-muted-foreground"
            />
            <YAxis
              label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft' } : undefined}
              className="text-xs fill-muted-foreground"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// =====================================================
// LINE CHART COMPONENT
// =====================================================

export function AdminLineChart({
  title,
  description,
  data,
  xKey,
  yKey,
  xLabel,
  yLabel,
  color = CHART_COLORS.primary,
  showPoints = true,
  className,
  height = 300,
}: LineChartProps) {
  return (
    <Card className={cn('w-full', className)}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle className="text-lg">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey={xKey}
              label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5 } : undefined}
              className="text-xs fill-muted-foreground"
            />
            <YAxis
              label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft' } : undefined}
              className="text-xs fill-muted-foreground"
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={yKey}
              stroke={color}
              strokeWidth={2}
              dot={showPoints ? { fill: color, r: 4 } : false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// =====================================================
// PIE CHART COMPONENT
// =====================================================

export function AdminPieChart({
  title,
  description,
  data,
  nameKey,
  valueKey,
  showLegend = true,
  showPercentage = true,
  className,
  height = 300,
}: PieChartProps) {
  const renderLabel = (entry: ChartDataPoint) => {
    if (showPercentage && entry.percentage) {
      return `${entry.percentage}%`;
    }
    return `${entry[valueKey]}`;
  };

  return (
    <Card className={cn('w-full', className)}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle className="text-lg">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey={valueKey}
              nameKey={nameKey}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// =====================================================
// MULTI-BAR CHART COMPONENT
// =====================================================

export function AdminMultiBarChart({
  title,
  description,
  data,
  xKey,
  bars,
  xLabel,
  yLabel,
  className,
  height = 300,
}: MultiBarChartProps) {
  return (
    <Card className={cn('w-full', className)}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle className="text-lg">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey={xKey}
              label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5 } : undefined}
              className="text-xs fill-muted-foreground"
            />
            <YAxis
              label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft' } : undefined}
              className="text-xs fill-muted-foreground"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {bars.map((bar) => (
              <Bar key={bar.key} dataKey={bar.key} name={bar.name} fill={bar.color} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// =====================================================
// STAT CARD WITH TREND COMPONENT
// =====================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function AdminStatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend.isPositive ? 'text-success' : 'text-destructive'
                  )}
                >
                  {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </span>
                <span className="text-xs text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          {icon && (
            <div className="ml-4 text-muted-foreground opacity-50">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// EXPORT CHART CONFIG TYPE
// =====================================================

export type ChartConfig = {
  title?: string;
  description?: string;
  type: 'bar' | 'line' | 'pie' | 'multibar';
  data: ChartDataPoint[];
  config: Partial<BarChartProps & LineChartProps & PieChartProps & MultiBarChartProps>;
};

// =====================================================
// DYNAMIC CHART RENDERER
// =====================================================

export function AdminDynamicChart({ title, description, type, data, config }: ChartConfig) {
  const commonProps = { title, description, data, ...config };

  switch (type) {
    case 'bar':
      return <AdminBarChart {...commonProps} {...(config as BarChartProps)} />;
    case 'line':
      return <AdminLineChart {...commonProps} {...(config as LineChartProps)} />;
    case 'pie':
      return <AdminPieChart {...commonProps} {...(config as PieChartProps)} />;
    case 'multibar':
      return <AdminMultiBarChart {...commonProps} {...(config as MultiBarChartProps)} />;
    default:
      return null;
  }
}
