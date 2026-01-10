'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Users,
  Play,
  CheckCircle2,
  XCircle,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface OccurrenceEvent {
  id: string;
  title: string;
  scheduleName: string;
  ministryName: string;
  ministryId: string;
  startTime: Date;
  endTime: Date;
  location?: string | null;
  status: string;
  registrationCount: number;
  attendanceCount: number;
  capacity?: number | null;
}

interface Ministry {
  id: string;
  name: string;
  code: string;
}

export interface ScheduleCalendarViewProps {
  className?: string;
  ministryId?: string;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-500';
    case 'in_progress':
      return 'bg-green-500';
    case 'completed':
      return 'bg-gray-500';
    case 'cancelled':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'in_progress':
      return <Play className="w-3 h-3" />;
    case 'completed':
      return <CheckCircle2 className="w-3 h-3" />;
    case 'cancelled':
      return <XCircle className="w-3 h-3" />;
    default:
      return <Calendar className="w-3 h-3" />;
  }
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

function CalendarDay({
  date,
  events,
  isCurrentMonth,
  isToday,
  onEventClick,
}: {
  date: Date;
  events: OccurrenceEvent[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onEventClick: (event: OccurrenceEvent) => void;
}) {
  return (
    <div
      className={cn(
        'min-h-[120px] p-2 border-b border-r border-border',
        !isCurrentMonth && 'bg-muted/30',
        isToday && 'bg-primary/5'
      )}
    >
      <div
        className={cn(
          'text-sm font-medium mb-1',
          !isCurrentMonth && 'text-muted-foreground',
          isToday && 'text-primary'
        )}
      >
        <span
          className={cn(
            isToday && 'bg-primary text-primary-foreground rounded-full w-6 h-6 inline-flex items-center justify-center'
          )}
        >
          {date.getDate()}
        </span>
      </div>
      <div className="space-y-1">
        {events.slice(0, 3).map((event) => (
          <button
            key={event.id}
            onClick={() => onEventClick(event)}
            className={cn(
              'w-full text-left text-xs p-1 rounded truncate',
              'hover:opacity-80 transition-opacity cursor-pointer',
              getStatusColor(event.status),
              'text-white'
            )}
            title={event.title}
          >
            <span className="flex items-center gap-1">
              {getStatusIcon(event.status)}
              <span className="truncate">{formatTime(event.startTime)} {event.title}</span>
            </span>
          </button>
        ))}
        {events.length > 3 && (
          <div className="text-xs text-muted-foreground pl-1">
            +{events.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
}

export function ScheduleCalendarView({ className, ministryId }: ScheduleCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [occurrences, setOccurrences] = useState<OccurrenceEvent[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [selectedMinistry, setSelectedMinistry] = useState<string>(ministryId || 'all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<OccurrenceEvent | null>(null);
  const { toast } = useToast();

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Calculate calendar grid
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const startDay = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month days
    const prevMonth = new Date(currentYear, currentMonth, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(currentYear, currentMonth - 1, prevMonthDays - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(currentYear, currentMonth, i),
        isCurrentMonth: true,
      });
    }

    // Next month days to fill grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(currentYear, currentMonth + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentMonth, currentYear]);

  const fetchMinistries = useCallback(async () => {
    try {
      const response = await fetch('/api/community/ministries');
      if (response.ok) {
        const result = await response.json();
        setMinistries(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching ministries:', error);
    }
  }, []);

  const fetchOccurrences = useCallback(async () => {
    try {
      setIsLoading(true);
      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 1, 0);

      let url = `/api/community/scheduler/occurrences?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      if (selectedMinistry !== 'all') {
        url += `&ministryId=${selectedMinistry}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch occurrences');
      }

      const result = await response.json();
      const events = (result.data || []).map(
        (occ: { startTime: string; endTime: string; [key: string]: unknown }) => ({
          ...occ,
          startTime: new Date(occ.startTime),
          endTime: new Date(occ.endTime),
        })
      );
      setOccurrences(events);
    } catch (error) {
      console.error('Error fetching occurrences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load calendar events.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth, currentYear, selectedMinistry, toast]);

  useEffect(() => {
    fetchMinistries();
  }, [fetchMinistries]);

  useEffect(() => {
    fetchOccurrences();
  }, [fetchOccurrences]);

  const getEventsForDate = (date: Date): OccurrenceEvent[] => {
    return occurrences.filter((occ) => {
      const occDate = new Date(occ.startTime);
      return (
        occDate.getDate() === date.getDate() &&
        occDate.getMonth() === date.getMonth() &&
        occDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const today = new Date();

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">{MONTHS[currentMonth]} {currentYear}</h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedMinistry} onValueChange={setSelectedMinistry}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Ministries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ministries</SelectItem>
              {ministries.map((ministry) => (
                <SelectItem key={ministry.id} value={ministry.id}>
                  {ministry.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild>
            <Link href="/admin/community/planning/scheduler/schedules/manage">
              <Plus className="w-4 h-4 mr-2" />
              New Schedule
            </Link>
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Schedule Calendar</CardTitle>
            {isLoading && (
              <span className="text-sm text-muted-foreground">Loading...</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                className="p-2 text-center text-sm font-medium text-muted-foreground border-r border-border last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map(({ date, isCurrentMonth }, index) => (
              <CalendarDay
                key={index}
                date={date}
                events={getEventsForDate(date)}
                isCurrentMonth={isCurrentMonth}
                isToday={
                  date.getDate() === today.getDate() &&
                  date.getMonth() === today.getMonth() &&
                  date.getFullYear() === today.getFullYear()
                }
                onEventClick={setSelectedEvent}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-500" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Cancelled</span>
        </div>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEvent.title}</DialogTitle>
                <DialogDescription>
                  {selectedEvent.ministryName} - {selectedEvent.scheduleName}
                </DialogDescription>
              </DialogHeader>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {selectedEvent.startTime.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}
                    </p>
                  </div>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                    <p>{selectedEvent.location}</p>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {selectedEvent.registrationCount} Registered
                      {selectedEvent.capacity && ` / ${selectedEvent.capacity}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedEvent.attendanceCount} checked in
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    className={cn(
                      'capitalize',
                      getStatusColor(selectedEvent.status),
                      'text-white'
                    )}
                  >
                    {getStatusIcon(selectedEvent.status)}
                    <span className="ml-1">{selectedEvent.status.replace('_', ' ')}</span>
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                  Close
                </Button>
                <Button asChild>
                  <Link href={`/admin/community/planning/scheduler/occurrences/${selectedEvent.id}`}>
                    View Details
                  </Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
