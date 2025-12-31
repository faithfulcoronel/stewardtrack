'use client';

import Link from 'next/link';
import { format, parseISO, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { Calendar, MapPin, ChevronRight, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { UpcomingEvent } from '@/models/dashboard/adminDashboard.model';

interface UpcomingEventsCardProps {
  events?: UpcomingEvent[];
  isLoading?: boolean;
}

function getDateBadge(dateString: string): { label: string; variant: 'default' | 'secondary' | 'outline' } | null {
  const date = parseISO(dateString);
  if (isToday(date)) return { label: 'Today', variant: 'default' };
  if (isTomorrow(date)) return { label: 'Tomorrow', variant: 'secondary' };
  if (isThisWeek(date)) return { label: 'This Week', variant: 'outline' };
  return null;
}

function EventItem({ event }: { event: UpcomingEvent }) {
  const eventDate = parseISO(event.startDate);
  const dateBadge = getDateBadge(event.startDate);

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="shrink-0 text-center bg-muted/50 rounded-lg p-2 min-w-[50px]">
        <p className="text-xs font-medium text-muted-foreground uppercase">
          {format(eventDate, 'MMM')}
        </p>
        <p className="text-lg font-bold text-foreground leading-none">
          {format(eventDate, 'd')}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground line-clamp-1">
              {event.title}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{format(eventDate, 'h:mm a')}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="line-clamp-1">{event.location}</span>
              </div>
            )}
          </div>
          {dateBadge && (
            <Badge variant={dateBadge.variant} className="text-xs shrink-0">
              {dateBadge.label}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function EventSkeleton() {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <Skeleton className="h-12 w-12 rounded-lg" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export function UpcomingEventsCard({ events, isLoading }: UpcomingEventsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Upcoming Events
          </CardTitle>
          <Link href="/admin/community/planning-calendar">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              View All
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div>
            <EventSkeleton />
            <EventSkeleton />
            <EventSkeleton />
          </div>
        ) : events && events.length > 0 ? (
          <div>
            {events.map((event) => (
              <EventItem key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No upcoming events
            </p>
            <Link href="/admin/community/planning-calendar">
              <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs">
                Add an event
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
