'use client';

/**
 * DeliveryStats Component
 *
 * Visual analytics dashboard for campaign delivery tracking.
 * Shows delivery funnel, status breakdown, and engagement metrics.
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Eye,
  MousePointerClick,
  TrendingUp,
  Users,
  AlertCircle,
} from 'lucide-react';

export interface DeliveryStatsData {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number;
  pending?: number;
  bounced?: number;
}

export interface DeliveryStatsProps {
  data: DeliveryStatsData;
  channel?: 'email' | 'sms' | 'both';
  showFunnel?: boolean;
  showTimeline?: boolean;
  compact?: boolean;
  className?: string;
}

interface StatCardProps {
  label: string;
  value: number | string;
  percentage?: number;
  icon: React.ReactNode;
  tone: 'positive' | 'negative' | 'neutral' | 'warning' | 'info';
  compact?: boolean;
}

function StatCard({ label, value, percentage, icon, tone, compact }: StatCardProps) {
  const toneStyles = {
    positive: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
    negative: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
    neutral: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  };

  const iconStyles = {
    positive: 'text-green-500',
    negative: 'text-red-500',
    neutral: 'text-gray-500',
    warning: 'text-amber-500',
    info: 'text-blue-500',
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors',
        toneStyles[tone],
        compact ? 'p-2' : 'p-4'
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn('shrink-0', iconStyles[tone])}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className={cn('font-medium', compact ? 'text-lg' : 'text-2xl')}>
            {typeof value === 'number' ? value.toLocaleString() : value}
            {percentage !== undefined && (
              <span className="ml-1 text-sm font-normal opacity-75">
                ({percentage}%)
              </span>
            )}
          </p>
          <p className={cn('truncate opacity-75', compact ? 'text-xs' : 'text-sm')}>
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

interface FunnelBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

function FunnelBar({ label, value, total, color }: FunnelBarProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {value.toLocaleString()} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full transition-all duration-500', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function DeliveryStats({
  data,
  channel = 'email',
  showFunnel = true,
  showTimeline = false,
  compact = false,
  className,
}: DeliveryStatsProps) {
  const stats = useMemo(() => {
    const { total, sent, delivered, failed, opened, clicked, pending, bounced } = data;

    // Calculate percentages
    const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
    const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
    const clickRate = opened > 0 ? Math.round((clicked / opened) * 100) : 0;
    const failureRate = sent > 0 ? Math.round((failed / sent) * 100) : 0;

    return {
      total,
      sent,
      delivered,
      failed,
      opened,
      clicked,
      pending: pending ?? 0,
      bounced: bounced ?? 0,
      deliveryRate,
      openRate,
      clickRate,
      failureRate,
    };
  }, [data]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Stats Grid */}
      <div
        className={cn(
          'grid gap-3',
          compact
            ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
            : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
        )}
      >
        <StatCard
          label="Total Recipients"
          value={stats.total}
          icon={<Users className="h-5 w-5" />}
          tone="neutral"
          compact={compact}
        />
        <StatCard
          label="Sent"
          value={stats.sent}
          percentage={stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0}
          icon={<Mail className="h-5 w-5" />}
          tone="info"
          compact={compact}
        />
        <StatCard
          label="Delivered"
          value={stats.delivered}
          percentage={stats.deliveryRate}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="positive"
          compact={compact}
        />
        <StatCard
          label="Failed"
          value={stats.failed}
          percentage={stats.failureRate}
          icon={<XCircle className="h-5 w-5" />}
          tone={stats.failed > 0 ? 'negative' : 'neutral'}
          compact={compact}
        />
        {channel === 'email' && (
          <>
            <StatCard
              label="Opened"
              value={stats.opened}
              percentage={stats.openRate}
              icon={<Eye className="h-5 w-5" />}
              tone={stats.openRate >= 20 ? 'positive' : 'warning'}
              compact={compact}
            />
            <StatCard
              label="Clicked"
              value={stats.clicked}
              percentage={stats.clickRate}
              icon={<MousePointerClick className="h-5 w-5" />}
              tone={stats.clickRate >= 5 ? 'positive' : 'neutral'}
              compact={compact}
            />
          </>
        )}
        {stats.pending > 0 && (
          <StatCard
            label="Pending"
            value={stats.pending}
            icon={<Clock className="h-5 w-5" />}
            tone="warning"
            compact={compact}
          />
        )}
      </div>

      {/* Delivery Funnel */}
      {showFunnel && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-4 flex items-center gap-2 font-medium">
            <TrendingUp className="h-4 w-4" />
            Delivery Funnel
          </h3>
          <div className="space-y-3">
            <FunnelBar
              label="Total Recipients"
              value={stats.total}
              total={stats.total}
              color="bg-blue-500"
            />
            <FunnelBar
              label="Messages Sent"
              value={stats.sent}
              total={stats.total}
              color="bg-indigo-500"
            />
            <FunnelBar
              label="Successfully Delivered"
              value={stats.delivered}
              total={stats.total}
              color="bg-green-500"
            />
            {channel === 'email' && (
              <>
                <FunnelBar
                  label="Opened"
                  value={stats.opened}
                  total={stats.total}
                  color="bg-emerald-500"
                />
                <FunnelBar
                  label="Clicked"
                  value={stats.clicked}
                  total={stats.total}
                  color="bg-teal-500"
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Delivery Rate
          </div>
          <p className="mt-1 text-2xl font-bold">
            {stats.deliveryRate}%
          </p>
          <p className="text-xs text-muted-foreground">
            {stats.deliveryRate >= 95
              ? 'Excellent delivery performance'
              : stats.deliveryRate >= 85
                ? 'Good delivery rate'
                : 'Consider reviewing failed recipients'}
          </p>
        </div>

        {channel === 'email' && (
          <>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4 text-blue-500" />
                Open Rate
              </div>
              <p className="mt-1 text-2xl font-bold">
                {stats.openRate}%
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.openRate >= 25
                  ? 'Above average open rate'
                  : stats.openRate >= 15
                    ? 'Average open rate'
                    : 'Try improving subject lines'}
              </p>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MousePointerClick className="h-4 w-4 text-purple-500" />
                Click Rate
              </div>
              <p className="mt-1 text-2xl font-bold">
                {stats.clickRate}%
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.clickRate >= 5
                  ? 'Good engagement with links'
                  : stats.clickRate >= 2
                    ? 'Average click-through rate'
                    : 'Consider clearer call-to-actions'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Error Summary */}
      {stats.failed > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-500" />
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-200">
                Delivery Issues Detected
              </h4>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                {stats.failed} message{stats.failed !== 1 ? 's' : ''} failed to deliver.
                {stats.bounced > 0 && ` ${stats.bounced} bounced.`}
                {' '}Review the recipient list for invalid addresses or opt-outs.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeliveryStats;
