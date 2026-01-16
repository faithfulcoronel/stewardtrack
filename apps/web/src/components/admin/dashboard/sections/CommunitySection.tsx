'use client';

import {
  Calendar,
  Cake,
  Bell,
  ChevronRight,
  MapPin,
  Clock,
  Users,
  PartyPopper,
  Heart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  type: 'service' | 'meeting' | 'fellowship' | 'outreach' | 'special';
  attendeeCount?: number;
}

interface Celebration {
  id: string;
  memberName: string;
  profilePictureUrl?: string | null;
  type: 'birthday' | 'anniversary' | 'membership';
  date: string;
  years?: number;
}

interface Announcement {
  id: string;
  title: string;
  excerpt: string;
  priority: 'high' | 'normal';
  postedAt: string;
}

interface CommunitySectionProps {
  upcomingEvents?: UpcomingEvent[];
  celebrations?: Celebration[];
  announcements?: Announcement[];
  timezone?: string;
  isLoading?: boolean;
}

/**
 * Get event type color
 */
function getEventTypeColor(type: string) {
  switch (type) {
    case 'service':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
    case 'meeting':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    case 'fellowship':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300';
    case 'outreach':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300';
    case 'special':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

/**
 * Get celebration icon
 */
function getCelebrationIcon(type: string) {
  switch (type) {
    case 'birthday':
      return Cake;
    case 'anniversary':
      return Heart;
    case 'membership':
      return PartyPopper;
    default:
      return Cake;
  }
}

/**
 * Format date to readable format
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format celebration date (birthday/anniversary) - shows month and day only
 * Uses tenant timezone for proper date display
 */
function formatCelebrationDate(dateStr: string, timezone: string = 'UTC'): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Create this year's version of the date for comparison
  const thisYearDate = new Date(today.getFullYear(), date.getMonth(), date.getDate());

  if (thisYearDate.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (thisYearDate.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: timezone
  }).format(date);
}

export function CommunitySection({
  upcomingEvents = [],
  celebrations = [],
  announcements = [],
  timezone = 'UTC',
  isLoading
}: CommunitySectionProps) {
  if (isLoading) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-0 shadow-md">
              <CardContent className="p-5">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Community Life
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Upcoming Events */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              Upcoming Events
              {upcomingEvents.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {upcomingEvents.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="mb-2 p-2 rounded-full bg-slate-100 dark:bg-slate-800">
                  <Calendar className="h-5 w-5 text-slate-500" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No upcoming events
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.slice(0, 4).map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {event.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(event.date)} • {event.time}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                      <Badge className={cn("text-[10px] flex-shrink-0", getEventTypeColor(event.type))}>
                        {event.type}
                      </Badge>
                    </div>
                  </div>
                ))}
                {upcomingEvents.length > 4 && (
                  <Button asChild variant="ghost" className="w-full text-sm">
                    <Link href="/admin/community/planning/calendar">
                      View all events
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Celebrations */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/30 dark:to-orange-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Cake className="h-4 w-4 text-amber-600" />
              Celebrations
              {celebrations.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                  {celebrations.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {celebrations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="mb-2 p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <Cake className="h-5 w-5 text-amber-500" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No celebrations today
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {celebrations.slice(0, 4).map((celebration) => {
                  const Icon = getCelebrationIcon(celebration.type);
                  const initials = celebration.memberName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .slice(0, 2);

                  return (
                    <div
                      key={celebration.id}
                      className="p-3 rounded-lg bg-white/60 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {celebration.profilePictureUrl && (
                            <AvatarImage src={celebration.profilePictureUrl} alt={celebration.memberName} />
                          )}
                          <AvatarFallback className="text-xs bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {celebration.memberName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCelebrationDate(celebration.date, timezone)}
                            {celebration.years && ` • Turning ${celebration.years}`}
                          </p>
                        </div>
                        <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                          <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {celebrations.length > 4 && (
                  <Button variant="ghost" className="w-full text-sm text-amber-600 hover:text-amber-700">
                    View all {celebrations.length} celebrations
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600" />
              Announcements
              {announcements.filter(a => a.priority === 'high').length > 0 && (
                <Badge className="ml-auto bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-xs">
                  {announcements.filter(a => a.priority === 'high').length} new
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {announcements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="mb-2 p-2 rounded-full bg-slate-100 dark:bg-slate-800">
                  <Bell className="h-5 w-5 text-slate-500" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No announcements
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {announcements.slice(0, 3).map((announcement) => (
                  <div
                    key={announcement.id}
                    className={cn(
                      "p-3 rounded-lg border transition-colors hover:bg-muted/50",
                      announcement.priority === 'high'
                        ? "bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                        : "bg-muted/30"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {announcement.priority === 'high' && (
                        <span className="flex-shrink-0 mt-0.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {announcement.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {announcement.excerpt}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {announcements.length > 3 && (
                  <Button variant="ghost" className="w-full text-sm">
                    View all announcements
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
