'use client';

import {
  Heart,
  UserCheck,
  Clock,
  ChevronRight,
  Phone,
  Home,
  MessageCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface CarePlanSummary {
  total: number;
  active: number;
  needsFollowUp: number;
  completedThisMonth: number;
}

interface FollowUp {
  id: string;
  memberName: string;
  type: 'call' | 'visit' | 'message';
  reason: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
}

interface PastoralCareSectionProps {
  carePlans?: CarePlanSummary;
  followUps?: FollowUp[];
  isLoading?: boolean;
}

/**
 * Get follow-up type icon
 */
function getFollowUpIcon(type: string) {
  switch (type) {
    case 'call':
      return Phone;
    case 'visit':
      return Home;
    case 'message':
      return MessageCircle;
    default:
      return Heart;
  }
}

/**
 * Get priority badge variant
 */
function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300';
    case 'medium':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

export function PastoralCareSection({
  carePlans,
  followUps = [],
  isLoading
}: PastoralCareSectionProps) {
  if (isLoading) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-36" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-0 shadow-md">
            <CardContent className="p-5">
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="text-center p-3">
                    <Skeleton className="h-8 w-12 mx-auto mb-2" />
                    <Skeleton className="h-4 w-20 mx-auto" />
                  </div>
                ))}
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
        <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/30">
          <Heart className="h-4 w-4 text-rose-600 dark:text-rose-400" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Pastoral Care
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Left: Care Plan Summary */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-rose-50/50 to-pink-50/30 dark:from-rose-950/30 dark:to-pink-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Care Plans Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-4 rounded-xl bg-white/60 dark:bg-white/5">
                <p className="text-3xl font-bold text-foreground">
                  {carePlans?.active || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Active Plans
                </p>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/60 dark:bg-white/5">
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {carePlans?.needsFollowUp || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Needs Follow-up
                </p>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/60 dark:bg-white/5">
                <p className="text-3xl font-bold text-foreground">
                  {carePlans?.total || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total Plans
                </p>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/60 dark:bg-white/5">
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {carePlans?.completedThisMonth || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Completed
                </p>
              </div>
            </div>

            <Button asChild variant="outline" className="w-full mt-4">
              <Link href="/admin/community/care-plans">
                Manage Care Plans
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Right: Follow-ups Due */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Follow-ups Due
              {followUps.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {followUps.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {followUps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-3 p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <UserCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-foreground">All Caught Up</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No follow-ups due today
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {followUps.slice(0, 4).map((followUp) => {
                  const Icon = getFollowUpIcon(followUp.type);
                  const initials = followUp.memberName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .slice(0, 2);

                  return (
                    <div
                      key={followUp.id}
                      className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">
                              {followUp.memberName}
                            </p>
                            <Badge className={cn("text-[10px]", getPriorityBadge(followUp.priority))}>
                              {followUp.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {followUp.reason}
                          </p>
                        </div>
                        <div className="flex-shrink-0 p-2 rounded-lg bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {followUps.length > 4 && (
                  <Button variant="ghost" className="w-full text-sm">
                    View all {followUps.length} follow-ups
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
