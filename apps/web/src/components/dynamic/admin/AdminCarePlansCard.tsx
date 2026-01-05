'use client';

import React from 'react';
import Link from 'next/link';

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

const priorityColors: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/30',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  low: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
};

export function AdminCarePlansCard(props: AdminCarePlansCardProps) {
  const metrics = normalizeList<CarePlanMetric>(props.metrics);
  const recentItems = normalizeList<CarePlanItem>(props.recentItems);
  const breakdown = props.priorityBreakdown;

  return (
    <Card className="border-border/60">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            {props.title && (
              <CardTitle className="text-xl font-semibold text-foreground">{props.title}</CardTitle>
            )}
            {props.description && (
              <CardDescription className="text-sm text-muted-foreground mt-1">
                {props.description}
              </CardDescription>
            )}
          </div>
          {props.addNewUrl && (
            <Button asChild size="sm" variant="outline">
              <Link href={props.addNewUrl}>+ Add care plan</Link>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Metrics Row */}
        {metrics.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {metrics.map((metric, idx) => (
              <div key={idx} className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                {metric.caption && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{metric.caption}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Priority Breakdown */}
        {breakdown && (breakdown.high || breakdown.medium || breakdown.low) && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Priority breakdown</p>
            <div className="flex gap-2">
              {breakdown.high !== undefined && breakdown.high > 0 && (
                <Badge variant="outline" className={cn('border', priorityColors.high)}>
                  {breakdown.high} High
                </Badge>
              )}
              {breakdown.medium !== undefined && breakdown.medium > 0 && (
                <Badge variant="outline" className={cn('border', priorityColors.medium)}>
                  {breakdown.medium} Medium
                </Badge>
              )}
              {breakdown.low !== undefined && breakdown.low > 0 && (
                <Badge variant="outline" className={cn('border', priorityColors.low)}>
                  {breakdown.low} Low
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Recent Care Plans */}
        {recentItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Recent care plans</p>
            <div className="space-y-2">
              {recentItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/admin/community/care-plans/${item.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        'border text-xs',
                        item.priority ? priorityColors[item.priority.toLowerCase()] : priorityColors.medium
                      )}
                    >
                      {item.priority || 'medium'}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.memberName || 'Unknown member'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.assignedTo ? `Assigned to ${item.assignedTo}` : 'Unassigned'}
                      </p>
                    </div>
                  </div>
                  {item.followUpAt && (
                    <p className="text-xs text-muted-foreground">
                      Follow-up: {new Date(item.followUpAt).toLocaleDateString()}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {recentItems.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">No active care plans</p>
            {props.addNewUrl && (
              <Button asChild variant="link" size="sm" className="mt-2">
                <Link href={props.addNewUrl}>Create your first care plan</Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {props.viewAllUrl && recentItems.length > 0 && (
        <CardFooter className="border-t pt-4">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href={props.viewAllUrl}>View all care plans</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
