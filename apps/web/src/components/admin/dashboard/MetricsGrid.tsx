'use client';

import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Calendar,
  Heart
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardMetrics } from '@/models/dashboard/adminDashboard.model';

interface MetricsGridProps {
  metrics?: DashboardMetrics;
  isLoading?: boolean;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  iconColor?: string;
  iconBg?: string;
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground';

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground sm:text-3xl">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && trendValue !== undefined && (
              <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
                <TrendIcon className="h-3 w-3" />
                <span>{trendValue}% from last month</span>
              </div>
            )}
          </div>
          <div className={`rounded-lg p-2.5 ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricsGrid({ metrics, isLoading }: MetricsGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
    );
  }

  if (!metrics) return null;

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Members"
        value={metrics.members.total.toLocaleString()}
        subtitle={`${metrics.members.newThisMonth} new this month`}
        icon={Users}
        trend={metrics.members.trend}
        trendValue={metrics.members.trendPercentage}
        iconColor="text-blue-600"
        iconBg="bg-blue-100 dark:bg-blue-900/30"
      />
      <MetricCard
        title="Donations"
        value={formatCurrency(metrics.finances.totalDonationsThisMonth, metrics.finances.currency)}
        subtitle={`${metrics.finances.donationCount} contributions`}
        icon={DollarSign}
        trend={metrics.finances.trend}
        trendValue={metrics.finances.trendPercentage}
        iconColor="text-green-600"
        iconBg="bg-green-100 dark:bg-green-900/30"
      />
      <MetricCard
        title="Upcoming Events"
        value={metrics.events.upcomingCount}
        subtitle={`${metrics.events.thisWeekCount} this week`}
        icon={Calendar}
        iconColor="text-purple-600"
        iconBg="bg-purple-100 dark:bg-purple-900/30"
      />
      <MetricCard
        title="Active Members"
        value={metrics.members.activeCount.toLocaleString()}
        subtitle="Currently active"
        icon={Heart}
        iconColor="text-rose-600"
        iconBg="bg-rose-100 dark:bg-rose-900/30"
      />
    </div>
  );
}
