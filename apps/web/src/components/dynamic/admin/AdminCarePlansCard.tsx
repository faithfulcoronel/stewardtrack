'use client';

import React from 'react';
import Link from 'next/link';
import {
  Heart,
  Plus,
  ArrowRight,
  Clock,
  User,
  AlertCircle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { normalizeList } from '../shared';

export interface CarePlanMetric {
  label: string;
  value: string;
  caption?: string | null;
}

export interface CarePlanItem {
  id: string;
  memberId?: string | null;
  memberName?: string | null;
  status?: string | null;
  priority?: string | null;
  assignedTo?: string | null;
  followUpAt?: string | null;
  isActive?: boolean | null;
}

export interface PriorityBreakdown {
  high?: number | null;
  medium?: number | null;
  low?: number | null;
}

export interface AdminCarePlansCardProps {
  title?: string | null;
  description?: string | null;
  metrics?: CarePlanMetric[] | { items?: CarePlanMetric[] } | null;
  priorityBreakdown?: PriorityBreakdown | null;
  recentItems?: CarePlanItem[] | { items?: CarePlanItem[] } | null;
  viewAllUrl?: string | null;
  addNewUrl?: string | null;
}

const priorityColors: Record<string, { badge: string; bg: string; text: string }> = {
  high: {
    badge: 'bg-destructive/10 text-destructive border-destructive/30',
    bg: 'bg-destructive/5',
    text: 'text-destructive',
  },
  medium: {
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    bg: 'bg-amber-500/5',
    text: 'text-amber-600 dark:text-amber-400',
  },
  low: {
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
};

export function AdminCarePlansCard(props: AdminCarePlansCardProps) {
  const metrics = normalizeList<CarePlanMetric>(props.metrics);
  const recentItems = normalizeList<CarePlanItem>(props.recentItems);
  const breakdown = props.priorityBreakdown;

  return (
    <Card className={cn(
      "group relative overflow-hidden",
      "border-border/40 bg-card/50 backdrop-blur-sm",
      "transition-all duration-300",
      "hover:border-border hover:shadow-lg hover:shadow-primary/5"
    )}>
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-rose-500/60" />

      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none" />

      <CardHeader className="relative space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-rose-500/10 ring-1 ring-rose-500/20">
              <Heart className="h-5 w-5 sm:h-5.5 sm:w-5.5 text-rose-500" />
            </div>
            <div>
              {props.title && (
                <CardTitle className="text-lg sm:text-xl font-semibold text-foreground">
                  {props.title}
                </CardTitle>
              )}
              {props.description && (
                <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {props.description}
                </CardDescription>
              )}
            </div>
          </div>
          {props.addNewUrl && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="gap-1.5 border-border/60 hover:border-rose-500/40 hover:bg-rose-500/5 transition-colors w-full sm:w-auto"
            >
              <Link href={props.addNewUrl}>
                <Plus className="h-4 w-4" />
                Add care plan
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative space-y-5 sm:space-y-6">
        {/* Metrics Row */}
        {metrics.length > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
            {metrics.map((metric, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex sm:flex-col items-center sm:items-center justify-between sm:justify-center gap-2 sm:gap-1",
                  "p-3 sm:p-4 rounded-xl",
                  "bg-gradient-to-br from-muted/60 to-muted/30",
                  "border border-border/40",
                  "transition-all duration-200 hover:border-border/60"
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <p className="text-xs sm:text-[10px] font-semibold uppercase tracking-wide text-muted-foreground order-1 sm:order-2">
                  {metric.label}
                </p>
                <p className="text-xl sm:text-2xl font-bold text-foreground order-2 sm:order-1">
                  {metric.value}
                </p>
                {metric.caption && (
                  <p className="hidden sm:block text-[10px] text-muted-foreground/70 mt-0.5 order-3">
                    {metric.caption}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Priority Breakdown */}
        {breakdown && (breakdown.high || breakdown.medium || breakdown.low) && (
          <div className="space-y-2.5">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-muted-foreground/70">
              Priority breakdown
            </p>
            <div className="flex flex-wrap gap-2">
              {breakdown.high != null && breakdown.high > 0 && (
                <Badge
                  variant="outline"
                  className={cn('border gap-1.5 text-xs sm:text-sm', priorityColors.high.badge)}
                >
                  <AlertCircle className="h-3 w-3" />
                  {breakdown.high} High
                </Badge>
              )}
              {breakdown.medium != null && breakdown.medium > 0 && (
                <Badge
                  variant="outline"
                  className={cn('border gap-1.5 text-xs sm:text-sm', priorityColors.medium.badge)}
                >
                  {breakdown.medium} Medium
                </Badge>
              )}
              {breakdown.low != null && breakdown.low > 0 && (
                <Badge
                  variant="outline"
                  className={cn('border gap-1.5 text-xs sm:text-sm', priorityColors.low.badge)}
                >
                  {breakdown.low} Low
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Recent Care Plans */}
        {recentItems.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-muted-foreground/70">
              Recent care plans
            </p>
            <div className="space-y-2">
              {recentItems.map((item, idx) => {
                const priority = item.priority?.toLowerCase() || 'medium';
                const colors = priorityColors[priority] || priorityColors.medium;
                return (
                  <Link
                    key={item.id}
                    href={`/admin/community/care-plans/${item.id}`}
                    className={cn(
                      "group/item flex items-center justify-between gap-3 p-3 sm:p-4 rounded-xl",
                      "border border-border/40 bg-card/50",
                      "transition-all duration-200",
                      "hover:border-border hover:bg-muted/30 hover:shadow-sm",
                      "cursor-pointer"
                    )}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge
                        variant="outline"
                        className={cn('border text-[10px] sm:text-xs shrink-0', colors.badge)}
                      >
                        {item.priority || 'medium'}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover/item:text-rose-600 dark:group-hover/item:text-rose-400 transition-colors">
                          {item.memberName || 'Unknown member'}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {item.assignedTo ? `Assigned to ${item.assignedTo}` : 'Unassigned'}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.followUpAt && (
                        <p className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(item.followUpAt).toLocaleDateString()}
                        </p>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover/item:text-rose-500 group-hover/item:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {recentItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 sm:py-10 text-center">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 shadow-inner mb-3">
              <Heart className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium text-foreground">No active care plans</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create your first care plan to get started
            </p>
            {props.addNewUrl && (
              <Button asChild variant="link" size="sm" className="mt-3 text-rose-600 dark:text-rose-400">
                <Link href={props.addNewUrl}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create care plan
                </Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {props.viewAllUrl && recentItems.length > 0 && (
        <CardFooter className="relative border-t border-border/40 pt-4">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full gap-2 hover:bg-rose-500/5 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
          >
            <Link href={props.viewAllUrl}>
              View all care plans
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
