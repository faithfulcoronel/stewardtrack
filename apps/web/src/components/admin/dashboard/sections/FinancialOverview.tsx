'use client';

import {
  Wallet,
  FileCheck,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { FinanceMetricsSummary } from '@/models/dashboard/adminDashboard.model';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface PendingApproval {
  id: string;
  type: 'transaction' | 'budget' | 'expense';
  title: string;
  amount: number;
  submittedBy: string;
  submittedAt: string;
}

interface FinancialOverviewProps {
  metrics?: FinanceMetricsSummary;
  userRoles: string[];
  pendingApprovals?: PendingApproval[];
  isLoading?: boolean;
}

/**
 * Format currency
 */
function formatCurrency(amount: number, currency: string = 'PHP'): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function FinancialOverview({
  metrics,
  userRoles,
  pendingApprovals = [],
  isLoading
}: FinancialOverviewProps) {
  const isTreasurer = userRoles.includes('role_treasurer');
  const isAuditor = userRoles.includes('role_auditor');

  if (isLoading) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-0 shadow-md">
            <CardContent className="p-5">
              <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-10 w-40" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-5">
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
          <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          {isAuditor ? 'Financial Oversight' : 'Financial Overview'}
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Left: Financial Summary */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/30 dark:to-teal-950/20">
          <CardContent className="p-5">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  This Month&apos;s Giving
                </p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {formatCurrency(metrics?.totalDonationsThisMonth || 0, metrics?.currency)}
                </p>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  {metrics?.trend === 'up' ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                  ) : metrics?.trend === 'down' ? (
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-slate-600" />
                  )}
                  <span className={cn(
                    "font-medium",
                    metrics?.trend === 'up' && "text-emerald-600",
                    metrics?.trend === 'down' && "text-red-600",
                    metrics?.trend === 'stable' && "text-slate-600"
                  )}>
                    {metrics?.trendPercentage || 0}%
                  </span>
                  <span className="text-muted-foreground">vs last month</span>
                </div>
              </div>

              <div className="pt-3 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total donations</span>
                  <span className="font-medium">{metrics?.donationCount || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Average donation</span>
                  <span className="font-medium">
                    {formatCurrency(metrics?.averageDonation || 0, metrics?.currency)}
                  </span>
                </div>
              </div>

              <Button asChild variant="outline" className="w-full mt-2">
                <Link href="/admin/finance">
                  {isTreasurer ? 'Manage Transactions' : 'View Financial Reports'}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right: Pending Approvals (Auditor) or Quick Actions (Treasurer) */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {isAuditor ? (
                <>
                  <FileCheck className="h-4 w-4 text-amber-600" />
                  Pending Approvals
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-blue-600" />
                  Recent Activity
                </>
              )}
              {pendingApprovals.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {pendingApprovals.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {pendingApprovals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-3 p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <FileCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-foreground">All Clear</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAuditor
                    ? 'No items awaiting your approval'
                    : 'No pending transactions'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingApprovals.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          by {item.submittedBy}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(item.amount)}
                        </p>
                        <Badge variant="outline" className="text-[10px] mt-1">
                          {item.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
                {pendingApprovals.length > 4 && (
                  <Button variant="ghost" className="w-full text-sm">
                    View all {pendingApprovals.length} items
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
