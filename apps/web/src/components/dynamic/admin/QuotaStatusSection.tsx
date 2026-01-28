'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserCog,
  HardDrive,
  MessageSquare,
  Mail,
  Receipt,
  Sparkles,
  AlertTriangle,
  Info,
  Loader2,
  RefreshCw,
  Crown,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { UsageSummary, QuotaType, QuotaStatus } from '@/models/tenantUsage.model';

// ============================================================================
// Types
// ============================================================================

interface QuotaDisplayConfig {
  label: string;
  description: string;
  icon: React.ElementType;
  unit: string;
  formatValue?: (value: number) => string;
}

// ============================================================================
// Configuration
// ============================================================================

const QUOTA_CONFIG: Record<QuotaType, QuotaDisplayConfig> = {
  members: {
    label: 'Church Members',
    description: 'Active church members in your database',
    icon: Users,
    unit: 'members',
  },
  admin_users: {
    label: 'Admin Users',
    description: 'Staff and admin users with elevated access',
    icon: UserCog,
    unit: 'users',
  },
  storage_mb: {
    label: 'Storage',
    description: 'Media and file storage used',
    icon: HardDrive,
    unit: 'MB',
    formatValue: (value: number) => {
      if (value >= 1024) {
        return `${(value / 1024).toFixed(2)} GB`;
      }
      return `${value.toFixed(2)} MB`;
    },
  },
  sms: {
    label: 'SMS Messages',
    description: 'SMS messages sent this billing period',
    icon: MessageSquare,
    unit: 'messages',
  },
  emails: {
    label: 'Emails',
    description: 'Emails sent this billing period',
    icon: Mail,
    unit: 'emails',
  },
  transactions: {
    label: 'Transactions',
    description: 'Financial transactions this billing period',
    icon: Receipt,
    unit: 'transactions',
  },
  ai_credits: {
    label: 'AI Credits',
    description: 'Monthly allocation resets each billing period. Purchased credits carry over.',
    icon: Sparkles,
    unit: 'credits',
  },
};

const QUOTA_ORDER: QuotaType[] = [
  'members',
  'admin_users',
  'storage_mb',
  'transactions',
  'emails',
  'sms',
  'ai_credits',
];

// ============================================================================
// Helper Functions
// ============================================================================

function getProgressColor(percentage: number, unavailable: boolean): string {
  if (unavailable) return 'bg-muted';
  if (percentage >= 100) return 'bg-destructive';
  if (percentage >= 80) return 'bg-amber-500';
  return 'bg-primary';
}

function getProgressBgColor(percentage: number, unavailable: boolean): string {
  if (unavailable) return 'bg-muted/30';
  if (percentage >= 100) return 'bg-destructive/20';
  if (percentage >= 80) return 'bg-amber-500/20';
  return 'bg-primary/20';
}

function formatQuotaValue(value: number, config: QuotaDisplayConfig): string {
  if (config.formatValue) {
    return config.formatValue(value);
  }
  return value.toLocaleString();
}

// ============================================================================
// Quota Item Component
// ============================================================================

interface QuotaItemProps {
  quotaType: QuotaType;
  status: QuotaStatus;
  isWarning: boolean;
}

function QuotaItem({ quotaType, status, isWarning }: QuotaItemProps) {
  const config = QUOTA_CONFIG[quotaType];
  const Icon = config.icon;

  const progressColor = getProgressColor(status.percentage, status.unavailable);
  const progressBgColor = getProgressBgColor(status.percentage, status.unavailable);

  // Check if this is AI credits with purchased balance
  const hasPurchasedCredits = quotaType === 'ai_credits' && (status.purchased_available ?? 0) > 0;
  const purchasedAvailable = status.purchased_available ?? 0;

  return (
    <div className="flex items-start gap-4 py-4 border-b last:border-b-0">
      {/* Icon */}
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
          status.unavailable
            ? 'bg-muted text-muted-foreground'
            : isWarning
              ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
              : 'bg-primary/10 text-primary'
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{config.label}</span>
            {status.unlimited && (
              <Badge variant="secondary" className="text-xs">
                Unlimited
              </Badge>
            )}
            {status.unavailable && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Not Available
              </Badge>
            )}
            {hasPurchasedCredits && (
              <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300 dark:text-emerald-400">
                +{purchasedAvailable.toLocaleString()} purchased
              </Badge>
            )}
            {isWarning && !status.unlimited && !status.unavailable && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Approaching limit ({status.percentage}% used)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {status.resets_monthly && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    {quotaType === 'ai_credits' ? (
                      <p>Monthly allocation resets. Purchased credits carry over.</p>
                    ) : (
                      <p>Resets at start of billing period</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Usage text */}
          <span className="text-sm text-muted-foreground">
            {status.unavailable ? (
              'Upgrade to enable'
            ) : status.unlimited ? (
              formatQuotaValue(status.current, config)
            ) : (
              <>
                {formatQuotaValue(status.current, config)} / {formatQuotaValue(status.limit!, config)}
                {hasPurchasedCredits && (
                  <span className="text-emerald-600 dark:text-emerald-400"> (+{purchasedAvailable.toLocaleString()})</span>
                )}
              </>
            )}
          </span>
        </div>

        {/* Progress bar */}
        {!status.unlimited && !status.unavailable && (
          <div className={`h-2 rounded-full ${progressBgColor}`}>
            <div
              className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
              style={{ width: `${Math.min(status.percentage, 100)}%` }}
            />
          </div>
        )}

        {/* Description */}
        <p className="mt-1 text-xs text-muted-foreground">{config.description}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export interface QuotaStatusSectionProps {
  /** Optional title override */
  title?: string;
  /** Optional description override */
  description?: string;
  /** Whether to show the refresh button */
  showRefresh?: boolean;
  /** Callback when data is refreshed */
  onRefresh?: () => void;
}

export function QuotaStatusSection({
  title = 'Usage & Quotas',
  description = 'Monitor your resource usage and plan limits',
  showRefresh = true,
  onRefresh,
}: QuotaStatusSectionProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UsageSummary | null>(null);

  const fetchQuotaData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/tenant/quota');
      if (!response.ok) {
        throw new Error('Failed to fetch quota data');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch quota data');
      }

      setData(result.data);

      if (isRefresh) {
        toast.success('Quota data refreshed');
        onRefresh?.();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load quota data';
      setError(message);
      if (isRefresh) {
        toast.error(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    fetchQuotaData();
  }, [fetchQuotaData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to Load</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error || 'Unable to load quota data'}</span>
            <Button variant="ghost" size="sm" onClick={() => fetchQuotaData()}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasWarnings = data.warnings && data.warnings.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        {showRefresh && (
          <Button variant="ghost" size="sm" onClick={() => fetchQuotaData(true)} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>

      {/* Current Plan Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{data.offering.name}</CardTitle>
                <CardDescription className="text-sm">
                  {data.offering.tier !== 'none' ? `${data.offering.tier} Tier` : 'No active subscription'}
                </CardDescription>
              </div>
            </div>
            {data.offering.tier !== 'none' && (
              <Badge variant="outline" className="text-primary border-primary">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Warnings Alert */}
      {hasWarnings && (
        <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-700 dark:text-amber-400">Approaching Limits</AlertTitle>
          <AlertDescription className="text-amber-600 dark:text-amber-300">
            {data.warnings!.length === 1
              ? `Your ${QUOTA_CONFIG[data.warnings![0]].label.toLowerCase()} usage is approaching the limit.`
              : `${data.warnings!.length} quotas are approaching their limits: ${data.warnings!.map((w) => QUOTA_CONFIG[w].label).join(', ')}.`}{' '}
            Consider upgrading your plan for higher limits.
          </AlertDescription>
        </Alert>
      )}

      {/* Quota Items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resource Usage</CardTitle>
          {data.billing_period.month_start && (
            <CardDescription>
              Current billing period started{' '}
              {new Date(data.billing_period.month_start).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="divide-y">
            {QUOTA_ORDER.map((quotaType) => {
              const status = data.quotas[quotaType];
              if (!status) return null;

              const isWarning = data.warnings?.includes(quotaType) || false;

              return <QuotaItem key={quotaType} quotaType={quotaType} status={status} isWarning={isWarning} />;
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade CTA (if on a lower tier) */}
      {data.offering.tier && ['Essential', 'none'].includes(data.offering.tier) && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Need more resources?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Upgrade to Professional or Enterprise for higher limits and advanced features.
                </p>
              </div>
              <Button variant="default">View Plans</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default QuotaStatusSection;
