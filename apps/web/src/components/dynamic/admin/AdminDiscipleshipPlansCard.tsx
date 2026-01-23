/**
 * ================================================================================
 * ADMIN DISCIPLESHIP PLANS CARD COMPONENT
 * ================================================================================
 *
 * Dashboard card displaying discipleship plans overview with metrics, pathway
 * breakdown, and recent active journeys.
 *
 * USAGE IN METADATA XML:
 *   <Component id="discipleship-plans-card" type="AdminDiscipleshipPlansCard">
 *     <Props>
 *       <Prop name="title" kind="binding" contract="discipleshipPlansCard.title"/>
 *       <Prop name="metrics" kind="binding" contract="discipleshipPlansCard.metrics"/>
 *       ...
 *     </Props>
 *   </Component>
 *
 * PROPS FROM SERVICE HANDLER:
 *   Handler: admin-community.dashboard.discipleship
 *   Returns: { discipleshipPlansCard: { title, description, metrics, ... } }
 *
 * ================================================================================
 */

'use client';

import React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Plus,
  ArrowRight,
  User,
  Target,
  Calendar,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { normalizeList } from '../shared';

export interface DiscipleshipPlanMetric {
  label: string;
  value: string;
  caption?: string | null;
}

export interface DiscipleshipPlanItem {
  id: string;
  memberName?: string | null;
  pathway?: string | null;
  mentor?: string | null;
  nextStep?: string | null;
  targetDate?: string | null;
}

export interface PathwayBreakdown {
  [pathway: string]: number;
}

export interface AdminDiscipleshipPlansCardProps {
  title?: string | null;
  description?: string | null;
  metrics?: DiscipleshipPlanMetric[] | { items?: DiscipleshipPlanMetric[] } | null;
  pathwayBreakdown?: PathwayBreakdown | null;
  recentItems?: DiscipleshipPlanItem[] | { items?: DiscipleshipPlanItem[] } | null;
  viewAllUrl?: string | null;
  addNewUrl?: string | null;
}

// Pathway color mappings for badges
const pathwayColors: Record<string, string> = {
  growth_track: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  leadership: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  foundations: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  discipleship_101: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  membership: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
  baptism: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
  small_group: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
  custom: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
  other: 'bg-muted text-muted-foreground border-border',
};

// Format pathway key to display label
function formatPathwayLabel(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function AdminDiscipleshipPlansCard(props: AdminDiscipleshipPlansCardProps) {
  const metrics = normalizeList<DiscipleshipPlanMetric>(props.metrics);
  const recentItems = normalizeList<DiscipleshipPlanItem>(props.recentItems);
  const breakdown = props.pathwayBreakdown;

  return (
    <Card className={cn(
      "group relative overflow-hidden",
      "border-border/40 bg-card/50 backdrop-blur-sm",
      "transition-all duration-300",
      "hover:border-border hover:shadow-lg hover:shadow-primary/5"
    )}>
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-500/60" />

      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />

      <CardHeader className="relative space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-purple-500/10 ring-1 ring-purple-500/20">
              <BookOpen className="h-5 w-5 sm:h-5.5 sm:w-5.5 text-purple-500" />
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
              className="gap-1.5 border-border/60 hover:border-purple-500/40 hover:bg-purple-500/5 transition-colors w-full sm:w-auto"
            >
              <Link href={props.addNewUrl}>
                <Plus className="h-4 w-4" />
                Add plan
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

        {/* Pathway Breakdown */}
        {breakdown && Object.keys(breakdown).length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-muted-foreground/70">
              Pathways
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(breakdown).map(([pathway, count]) => (
                <Badge
                  key={pathway}
                  variant="outline"
                  className={cn('border gap-1 text-xs sm:text-sm', pathwayColors[pathway] || pathwayColors.other)}
                >
                  <span className="font-semibold">{count}</span>
                  {formatPathwayLabel(pathway)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recent Discipleship Plans */}
        {recentItems.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-muted-foreground/70">
              Active journeys
            </p>
            <div className="space-y-2">
              {recentItems.map((item, idx) => {
                const pathwayKey = item.pathway?.toLowerCase().replace(/\s+/g, '_') || 'other';
                return (
                  <Link
                    key={item.id}
                    href={`/admin/community/discipleship-plans/${item.id}`}
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
                        className={cn(
                          'border text-[10px] sm:text-xs shrink-0',
                          pathwayColors[pathwayKey] || pathwayColors.other
                        )}
                      >
                        {item.pathway || 'Custom'}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover/item:text-purple-600 dark:group-hover/item:text-purple-400 transition-colors">
                          {item.memberName || 'Unknown member'}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {item.mentor ? `Mentor: ${item.mentor}` : 'No mentor assigned'}
                          </span>
                        </p>
                        {item.nextStep && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Target className="h-3 w-3 shrink-0" />
                            <span className="truncate">Next: {item.nextStep}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.targetDate && (
                        <p className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(item.targetDate).toLocaleDateString()}
                        </p>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover/item:text-purple-500 group-hover/item:translate-x-0.5 transition-all" />
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
              <BookOpen className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium text-foreground">No active discipleship plans</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create your first discipleship plan to get started
            </p>
            {props.addNewUrl && (
              <Button asChild variant="link" size="sm" className="mt-3 text-purple-600 dark:text-purple-400">
                <Link href={props.addNewUrl}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create plan
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
            className="w-full gap-2 hover:bg-purple-500/5 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            <Link href={props.viewAllUrl}>
              View all discipleship plans
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
