'use client';

import {
  Compass,
  CheckCircle2,
  Circle,
  ChevronRight,
  BookOpen,
  Users,
  Heart,
  Award,
  Calendar,
  MapPin,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface JourneyMilestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedDate?: string;
}

interface GrowthOpportunity {
  id: string;
  title: string;
  type: 'class' | 'group' | 'service' | 'event';
  date?: string;
  location?: string;
  spotsAvailable?: number;
}

interface ServiceRecord {
  id: string;
  ministry: string;
  role: string;
  nextServing?: string;
  hoursThisMonth?: number;
}

interface MyJourneySectionProps {
  milestones?: JourneyMilestone[];
  opportunities?: GrowthOpportunity[];
  serviceRecords?: ServiceRecord[];
  memberSince?: string;
  userRoles: string[];
  isLoading?: boolean;
}

/**
 * Get opportunity type icon
 */
function getOpportunityIcon(type: string) {
  switch (type) {
    case 'class':
      return BookOpen;
    case 'group':
      return Users;
    case 'service':
      return Heart;
    case 'event':
      return Calendar;
    default:
      return Sparkles;
  }
}

/**
 * Get opportunity type color
 */
function getOpportunityColor(type: string) {
  switch (type) {
    case 'class':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
    case 'group':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300';
    case 'service':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300';
    case 'event':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

/**
 * Get section title based on role
 */
function getSectionTitle(roles: string[]): string {
  if (roles.includes('role_visitor')) {
    return 'Start Your Journey';
  }
  if (roles.includes('role_volunteer')) {
    return 'My Service & Growth';
  }
  return 'My Faith Journey';
}

/**
 * Calculate journey progress
 */
function calculateProgress(milestones: JourneyMilestone[]): number {
  if (!milestones || milestones.length === 0) return 0;
  const completed = milestones.filter(m => m.completed).length;
  return Math.round((completed / milestones.length) * 100);
}

export function MyJourneySection({
  milestones = [],
  opportunities = [],
  serviceRecords = [],
  memberSince,
  userRoles,
  isLoading
}: MyJourneySectionProps) {
  const isVolunteer = userRoles.includes('role_volunteer');
  const isVisitor = userRoles.includes('role_visitor');
  const sectionTitle = getSectionTitle(userRoles);
  const progress = calculateProgress(milestones);

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
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-4 w-full mb-6" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-5">
              <Skeleton className="h-6 w-40 mb-4" />
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
        <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
          <Compass className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          {sectionTitle}
        </h2>
        {memberSince && !isVisitor && (
          <Badge variant="outline" className="ml-auto text-xs">
            Member since {new Date(memberSince).getFullYear()}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Journey Progress / Milestones */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-indigo-50/50 to-violet-50/30 dark:from-indigo-950/30 dark:to-violet-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-600" />
              {isVisitor ? 'Getting Started' : 'Growth Milestones'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Progress Bar */}
            {!isVisitor && milestones.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Your progress</span>
                  <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    {progress}%
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {milestones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="mb-3 p-3 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                  <Compass className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h4 className="font-medium text-foreground mb-1">
                  {isVisitor ? 'Welcome to Our Church!' : 'Your Journey Awaits'}
                </h4>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {isVisitor
                    ? 'Take your first steps to connect with our community.'
                    : 'Track your spiritual growth journey with meaningful milestones.'}
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href={isVisitor ? '/admin/community/connect' : '/admin/community/discipleship'}>
                    {isVisitor ? 'Connect Now' : 'View Journey'}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {milestones.slice(0, 5).map((milestone, index) => (
                  <div
                    key={milestone.id}
                    className={cn(
                      "p-3 rounded-lg transition-colors",
                      milestone.completed
                        ? "bg-white/60 dark:bg-white/5"
                        : "bg-white/40 dark:bg-white/[0.02] border border-dashed border-indigo-200 dark:border-indigo-800"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "flex-shrink-0 mt-0.5",
                        milestone.completed
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                      )}>
                        {milestone.completed ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium",
                          milestone.completed
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}>
                          {milestone.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {milestone.completed && milestone.completedDate
                            ? `Completed ${new Date(milestone.completedDate).toLocaleDateString()}`
                            : milestone.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {milestones.length > 5 && (
                  <Button asChild variant="ghost" className="w-full text-sm text-indigo-600 hover:text-indigo-700">
                    <Link href="/admin/community/discipleship">
                      View full journey
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Service Records (Volunteers) or Growth Opportunities */}
        {isVolunteer && serviceRecords.length > 0 ? (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-600" />
                My Service
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {serviceRecords.slice(0, 3).map((record) => (
                  <div
                    key={record.id}
                    className="p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {record.ministry}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {record.role}
                        </p>
                        {record.nextServing && (
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Next: {record.nextServing}</span>
                          </div>
                        )}
                      </div>
                      {record.hoursThisMonth !== undefined && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                            {record.hoursThisMonth}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            hrs this month
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <Button asChild variant="outline" className="w-full">
                  <Link href="/admin/community/planning/scheduler">
                    View Schedule
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600" />
                Growth Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {opportunities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="mb-3 p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <Sparkles className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h4 className="font-medium text-foreground mb-1">
                    Grow With Us
                  </h4>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Discover classes, groups, and ways to serve in our community.
                  </p>
                  <Button asChild variant="outline" className="mt-4">
                    <Link href="/admin/community/planning/calendar">
                      Browse Events
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {opportunities.slice(0, 4).map((opportunity) => {
                    const Icon = getOpportunityIcon(opportunity.type);
                    const colorClass = getOpportunityColor(opportunity.type);

                    return (
                      <div
                        key={opportunity.id}
                        className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            colorClass.split(' ')[0]
                          )}>
                            <Icon className={cn("h-4 w-4", colorClass.split(' ').slice(1).join(' '))} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground truncate">
                                {opportunity.title}
                              </p>
                              <Badge className={cn("text-[10px] flex-shrink-0", colorClass)}>
                                {opportunity.type}
                              </Badge>
                            </div>
                            {(opportunity.date || opportunity.location) && (
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                {opportunity.date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {opportunity.date}
                                  </span>
                                )}
                                {opportunity.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {opportunity.location}
                                  </span>
                                )}
                              </div>
                            )}
                            {opportunity.spotsAvailable !== undefined && opportunity.spotsAvailable > 0 && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                {opportunity.spotsAvailable} spots available
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {opportunities.length > 4 && (
                    <Button asChild variant="ghost" className="w-full text-sm">
                      <Link href="/admin/community/planning/calendar">
                        View all opportunities
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
