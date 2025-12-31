'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PlanningCalendar, type CalendarEvent, type CalendarCategory } from '@/components/dynamic/admin/PlanningCalendar';
import { useToast } from '@/components/ui/use-toast';

interface CalendarData {
  events: CalendarEvent[];
  categories: CalendarCategory[];
  stats: {
    totalEvents: number;
    upcomingEvents: number;
    carePlanEvents: number;
    discipleshipEvents: number;
    completedThisWeek: number;
    overdueEvents: number;
  };
}

export function PlanningCalendarContent() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const fetchCalendarData = useCallback(async () => {
    try {
      setIsLoading(true);
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);

      const response = await fetch(
        `/api/community/planning/calendar?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch calendar data');
      }

      const result = await response.json();

      // Transform events to have Date objects
      const events = result.events.map((event: { start: string | Date; end: string | Date | null; [key: string]: unknown }) => ({
        ...event,
        start: new Date(event.start),
        end: event.end ? new Date(event.end) : null,
      }));

      setData({
        events,
        categories: result.categories,
        stats: result.stats,
      });
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load calendar data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleSync = useCallback(async () => {
    try {
      const response = await fetch('/api/community/planning/sync', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to sync events');
      }

      const result = await response.json();

      toast({
        title: 'Sync Complete',
        description: result.message,
      });

      // Refresh calendar data
      await fetchCalendarData();
    } catch (error) {
      console.error('Error syncing events:', error);
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync events from care plans and discipleship.',
        variant: 'destructive',
      });
    }
  }, [fetchCalendarData, toast]);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    // Navigate to source if available
    if (event.sourceType && event.sourceId) {
      if (event.sourceType === 'member_care_plans') {
        window.location.href = `/admin/community/care-plans/${event.sourceId}`;
      } else if (event.sourceType === 'member_discipleship_plans') {
        window.location.href = `/admin/community/discipleship-plans/${event.sourceId}`;
      }
    }
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    console.log('Date selected:', date);
    // Could open a create event dialog here
  }, []);

  const handleCreateEvent = useCallback(() => {
    router.push('/admin/community/planning/manage');
  }, [router]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  return (
    <PlanningCalendar
      events={data?.events || []}
      categories={data?.categories || []}
      isLoading={isLoading}
      onEventClick={handleEventClick}
      onDateSelect={handleDateSelect}
      onCreateEvent={handleCreateEvent}
      onSync={handleSync}
    />
  );
}
