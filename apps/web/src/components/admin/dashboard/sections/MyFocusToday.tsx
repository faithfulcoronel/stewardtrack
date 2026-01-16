'use client';

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Heart,
  DollarSign,
  Users,
  Calendar,
  FileCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardHighlight } from '@/models/dashboard/adminDashboard.model';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface MyFocusTodayProps {
  highlights?: DashboardHighlight[];
  userRoles: string[];
  isLoading?: boolean;
}

/**
 * Get role-specific section title
 */
function getSectionTitle(roles: string[]): string {
  if (roles.includes('role_senior_pastor') || roles.includes('role_associate_pastor')) {
    return 'Pastoral Focus';
  }
  if (roles.includes('role_treasurer')) {
    return 'Financial Tasks';
  }
  if (roles.includes('role_auditor')) {
    return 'Pending Reviews';
  }
  if (roles.includes('role_ministry_leader')) {
    return 'Ministry Priorities';
  }
  if (roles.includes('role_volunteer')) {
    return 'My Service';
  }
  if (roles.includes('role_member') || roles.includes('role_visitor')) {
    return 'Getting Connected';
  }
  return 'My Focus Today';
}

/**
 * Get icon for highlight type
 */
function getHighlightIcon(type: string) {
  switch (type) {
    case 'follow-up':
      return Heart;
    case 'approval-needed':
      return FileCheck;
    case 'task-due':
      return CheckCircle2;
    case 'event-reminder':
      return Calendar;
    case 'birthday':
    case 'anniversary':
      return Users;
    case 'system-alert':
      return AlertCircle;
    case 'milestone':
      return Sparkles;
    default:
      return Clock;
  }
}

/**
 * Get priority color classes
 */
function getPriorityClasses(priority: string) {
  switch (priority) {
    case 'urgent':
      return {
        bg: 'bg-red-50 dark:bg-red-950/30',
        border: 'border-red-200 dark:border-red-800',
        icon: 'text-red-600 dark:text-red-400',
        badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
      };
    case 'high':
      return {
        bg: 'bg-orange-50 dark:bg-orange-950/30',
        border: 'border-orange-200 dark:border-orange-800',
        icon: 'text-orange-600 dark:text-orange-400',
        badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
      };
    case 'medium':
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        border: 'border-amber-200 dark:border-amber-800',
        icon: 'text-amber-600 dark:text-amber-400',
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
      };
    default:
      return {
        bg: 'bg-slate-50 dark:bg-slate-900/30',
        border: 'border-slate-200 dark:border-slate-700',
        icon: 'text-slate-600 dark:text-slate-400',
        badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
      };
  }
}

/**
 * Empty state for when there are no highlights
 */
function EmptyState({ roles }: { roles: string[] }) {
  const isPastor = roles.includes('role_senior_pastor') || roles.includes('role_associate_pastor');
  const isFinance = roles.includes('role_treasurer') || roles.includes('role_auditor');

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-4 p-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
        <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        All Caught Up!
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        {isPastor && "No urgent pastoral needs at the moment. Take time to pray and prepare."}
        {isFinance && "No pending financial items. Great job staying on top of things!"}
        {!isPastor && !isFinance && "Nothing needs your immediate attention. Enjoy your day!"}
      </p>
    </div>
  );
}

export function MyFocusToday({ highlights, userRoles, isLoading }: MyFocusTodayProps) {
  const sectionTitle = getSectionTitle(userRoles);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-xl border bg-muted/30">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasHighlights = highlights && highlights.length > 0;

  // Sort highlights by priority
  const sortedHighlights = hasHighlights
    ? [...highlights].sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
      })
    : [];

  return (
    <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            {sectionTitle}
          </CardTitle>
          {hasHighlights && (
            <Badge variant="secondary" className="text-xs">
              {highlights.length} item{highlights.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasHighlights ? (
          <EmptyState roles={userRoles} />
        ) : (
          <div className="space-y-3">
            {sortedHighlights.slice(0, 5).map((highlight) => {
              const Icon = getHighlightIcon(highlight.type);
              const colors = getPriorityClasses(highlight.priority);

              return (
                <div
                  key={highlight.id}
                  className={cn(
                    "group p-4 rounded-xl border transition-all duration-200",
                    "hover:shadow-md hover:scale-[1.01]",
                    colors.bg,
                    colors.border
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex-shrink-0 p-2.5 rounded-lg",
                      colors.bg
                    )}>
                      <Icon className={cn("h-5 w-5", colors.icon)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-foreground line-clamp-1">
                          {highlight.title}
                        </h4>
                        <Badge className={cn("flex-shrink-0 text-[10px]", colors.badge)}>
                          {highlight.priority}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {highlight.description}
                      </p>
                      {highlight.actionHref && highlight.actionLabel && (
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="mt-2 -ml-2 h-8 text-primary hover:text-primary"
                        >
                          <Link href={highlight.actionHref}>
                            {highlight.actionLabel}
                            <ChevronRight className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {highlights.length > 5 && (
              <Button
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
              >
                View all {highlights.length} items
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
