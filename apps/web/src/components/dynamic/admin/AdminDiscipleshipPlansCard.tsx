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
              <Link href={props.addNewUrl}>+ Add plan</Link>
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

        {/* Pathway Breakdown */}
        {breakdown && Object.keys(breakdown).length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Pathways</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(breakdown).map(([pathway, count]) => (
                <Badge
                  key={pathway}
                  variant="outline"
                  className={cn('border', pathwayColors[pathway] || pathwayColors.other)}
                >
                  {count} {formatPathwayLabel(pathway)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recent Discipleship Plans */}
        {recentItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Active journeys</p>
            <div className="space-y-2">
              {recentItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/admin/community/discipleship-plans/${item.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        'border text-xs',
                        item.pathway ? pathwayColors[item.pathway.toLowerCase().replace(/\s+/g, '_')] || pathwayColors.other : pathwayColors.other
                      )}
                    >
                      {item.pathway || 'Custom'}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.memberName || 'Unknown member'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.mentor ? `Mentor: ${item.mentor}` : 'No mentor assigned'}
                        {item.nextStep && ` · Next: ${item.nextStep}`}
                      </p>
                    </div>
                  </div>
                  {item.targetDate && (
                    <p className="text-xs text-muted-foreground">
                      Target: {new Date(item.targetDate).toLocaleDateString()}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {recentItems.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">No active discipleship plans</p>
            {props.addNewUrl && (
              <Button asChild variant="link" size="sm" className="mt-2">
                <Link href={props.addNewUrl}>Create your first discipleship plan</Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {props.viewAllUrl && recentItems.length > 0 && (
        <CardFooter className="border-t pt-4">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href={props.viewAllUrl}>View all discipleship plans</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
