'use client';

import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Calendar,
  Heart,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardMetrics } from '@/models/dashboard/adminDashboard.model';
import { cn } from '@/lib/utils';

interface ChurchPulseSectionProps {
  metrics?: DashboardMetrics;
  isLoading?: boolean;
}

/**
 * Format currency with proper locale
 */
function formatCurrency(amount: number, currency: string = 'PHP'): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get trend icon and color
 */
function getTrendInfo(trend: 'up' | 'down' | 'stable', percentage: number) {
  switch (trend) {
    case 'up':
      return {
        Icon: TrendingUp,
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        label: `+${percentage}% from last month`
      };
    case 'down':
      return {
        Icon: TrendingDown,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        label: `-${percentage}% from last month`
      };
    default:
      return {
        Icon: Minus,
        color: 'text-slate-600 dark:text-slate-400',
        bgColor: 'bg-slate-100 dark:bg-slate-900/30',
        label: 'No change from last month'
      };
  }
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  trendPercentage?: number;
  icon: React.ComponentType<{ className?: string }>;
  color: {
    bg: string;
    icon: string;
    gradient: string;
  };
  isLoading?: boolean;
}

function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendPercentage = 0,
  icon: Icon,
  color,
  isLoading
}: MetricCardProps) {
  const trendInfo = trend ? getTrendInfo(trend, trendPercentage) : null;

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-12 w-12 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md group hover:shadow-lg transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <p className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}
            {trendInfo && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded",
                  trendInfo.bgColor,
                  trendInfo.color
                )}>
                  <trendInfo.Icon className="h-3 w-3" />
                  {trendPercentage}%
                </span>
                <span className="text-xs text-muted-foreground">
                  from last month
                </span>
              </div>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-xl shadow-sm",
            color.bg
          )}>
            <Icon className={cn("h-6 w-6", color.icon)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ChurchPulseSection({ metrics, isLoading }: ChurchPulseSectionProps) {
  const metricCards = [
    {
      title: 'Total Members',
      value: metrics?.members?.total || 0,
      subtitle: `${metrics?.members?.newThisMonth || 0} new this month`,
      trend: metrics?.members?.trend,
      trendPercentage: metrics?.members?.trendPercentage,
      icon: Users,
      color: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        icon: 'text-blue-600 dark:text-blue-400',
        gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
      },
    },
    {
      title: 'Donations',
      value: formatCurrency(
        metrics?.finances?.totalDonationsThisMonth || 0,
        metrics?.finances?.currency
      ),
      subtitle: `${metrics?.finances?.donationCount || 0} contributions`,
      trend: metrics?.finances?.trend,
      trendPercentage: metrics?.finances?.trendPercentage,
      icon: DollarSign,
      color: {
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        icon: 'text-emerald-600 dark:text-emerald-400',
        gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      },
    },
    {
      title: 'Upcoming Events',
      value: metrics?.events?.upcomingCount || 0,
      subtitle: `${metrics?.events?.thisWeekCount || 0} this week`,
      icon: Calendar,
      color: {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        icon: 'text-purple-600 dark:text-purple-400',
        gradient: 'bg-gradient-to-br from-purple-500 to-purple-600',
      },
    },
    {
      title: 'Active Members',
      value: metrics?.members?.activeCount || 0,
      subtitle: 'Currently active',
      icon: Heart,
      color: {
        bg: 'bg-rose-100 dark:bg-rose-900/30',
        icon: 'text-rose-600 dark:text-rose-400',
        gradient: 'bg-gradient-to-br from-rose-500 to-rose-600',
      },
    },
  ];

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Activity className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Church Pulse
        </h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, index) => (
          <MetricCard key={index} {...card} isLoading={isLoading} />
        ))}
      </div>
    </section>
  );
}
