'use client';

import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import {
  Cake,
  Heart,
  Calendar,
  CheckSquare,
  AlertCircle,
  Bell,
  Trophy,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardHighlight, HighlightType, HighlightPriority } from '@/models/dashboard/adminDashboard.model';

interface HighlightsCardProps {
  highlights?: DashboardHighlight[];
  isLoading?: boolean;
}

const typeIcons: Record<HighlightType, React.ComponentType<{ className?: string }>> = {
  birthday: Cake,
  anniversary: Heart,
  'follow-up': CheckSquare,
  'event-reminder': Calendar,
  'task-due': CheckSquare,
  'approval-needed': AlertCircle,
  'system-alert': Bell,
  milestone: Trophy,
};

const typeColors: Record<HighlightType, { bg: string; text: string }> = {
  birthday: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400' },
  anniversary: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400' },
  'follow-up': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  'event-reminder': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  'task-due': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
  'approval-needed': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
  'system-alert': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
  milestone: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
};

const priorityBadgeVariants: Record<HighlightPriority, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  urgent: { variant: 'destructive' },
  high: { variant: 'default', className: 'bg-orange-500 hover:bg-orange-600' },
  medium: { variant: 'secondary' },
  low: { variant: 'outline' },
};

function HighlightItem({ highlight }: { highlight: DashboardHighlight }) {
  const Icon = typeIcons[highlight.type] || Bell;
  const colors = typeColors[highlight.type] || typeColors['system-alert'];
  const badgeConfig = priorityBadgeVariants[highlight.priority];

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className={`rounded-lg p-2 shrink-0 ${colors.bg}`}>
        <Icon className={`h-4 w-4 ${colors.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground line-clamp-1">
              {highlight.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {highlight.description}
            </p>
          </div>
          {(highlight.priority === 'urgent' || highlight.priority === 'high') && (
            <Badge
              variant={badgeConfig.variant}
              className={`text-xs shrink-0 ${badgeConfig.className || ''}`}
            >
              {highlight.priority}
            </Badge>
          )}
        </div>
        {highlight.actionHref && highlight.actionLabel && (
          <Link href={highlight.actionHref}>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs mt-1"
            >
              {highlight.actionLabel}
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function HighlightSkeleton() {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <Skeleton className="h-8 w-8 rounded-lg" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function HighlightsCard({ highlights, isLoading }: HighlightsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Needs Attention
          </CardTitle>
          {highlights && highlights.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {highlights.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div>
            <HighlightSkeleton />
            <HighlightSkeleton />
            <HighlightSkeleton />
          </div>
        ) : highlights && highlights.length > 0 ? (
          <div>
            {highlights.map((highlight) => (
              <HighlightItem key={highlight.id} highlight={highlight} />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="mx-auto rounded-full bg-green-100 dark:bg-green-900/30 p-3 w-fit mb-3">
              <CheckSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm text-muted-foreground">
              All caught up! No items need attention.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
