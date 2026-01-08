'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  LayoutGrid,
  Plus,
  Filter,
  Clock,
  MapPin,
  User,
  Heart,
  BookOpen,
  Users,
  Bell,
  Circle,
  ChevronDown,
  ExternalLink,
  Tag,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Cake,
  Gift,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

// Types
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start: Date;
  end?: Date | null;
  allDay: boolean;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryColor: string;
  categoryIcon?: string | null;
  eventType: string;
  status: string;
  priority: string;
  sourceType?: string | null;
  sourceId?: string | null;
  memberId?: string | null;
  memberName?: string | null;
  assignedToId?: string | null;
  assignedToName?: string | null;
  isRecurring: boolean;
  isPrivate: boolean;
  tags: string[];
}

export interface CalendarCategory {
  id: string;
  name: string;
  code: string;
  color: string;
  icon?: string | null;
}

export type ViewMode = 'month' | 'week' | 'day' | 'agenda';

export interface PlanningCalendarProps {
  events?: CalendarEvent[];
  categories?: CalendarCategory[];
  isLoading?: boolean;
  initialView?: ViewMode;
  backUrl?: string;
  onEventClick?: (event: CalendarEvent) => void;
  onDateSelect?: (date: Date) => void;
  onCreateEvent?: () => void;
  onSync?: () => Promise<void>;
  onDateRangeChange?: (startDate: Date, endDate: Date) => void;
}

// Helper functions
const getDaysInMonth = (date: Date): Date[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Start from Sunday of the week containing the first day
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // End on Saturday of the week containing the last day
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const days: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    days.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return days;
};

const getWeekDays = (date: Date): Date[] => {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
  }
  return days;
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const isToday = (date: Date): boolean => isSameDay(date, new Date());

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

// Helper component to render category icons
const CategoryIcon: React.FC<{
  iconName?: string | null;
  className?: string;
  style?: React.CSSProperties;
}> = ({ iconName, className, style }) => {
  switch (iconName) {
    case 'heart':
      return <Heart className={className} style={style} />;
    case 'book-open':
      return <BookOpen className={className} style={style} />;
    case 'users':
      return <Users className={className} style={style} />;
    case 'bell':
      return <Bell className={className} style={style} />;
    case 'calendar':
      return <CalendarIcon className={className} style={style} />;
    case 'cake':
      return <Cake className={className} style={style} />;
    case 'gift':
      return <Gift className={className} style={style} />;
    case 'circle':
    default:
      return <Circle className={className} style={style} />;
  }
};

const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500';
    case 'high':
      return 'bg-orange-500';
    case 'normal':
      return 'bg-blue-500';
    case 'low':
      return 'bg-gray-400';
    default:
      return 'bg-blue-500';
  }
};

const getPriorityBadgeVariant = (priority: string): 'destructive' | 'default' | 'secondary' | 'outline' => {
  switch (priority) {
    case 'urgent':
      return 'destructive';
    case 'high':
      return 'default';
    default:
      return 'secondary';
  }
};

// Helper component to render status icons
const StatusIcon: React.FC<{
  status: string;
  className?: string;
}> = ({ status, className }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className={className} />;
    case 'cancelled':
      return <XCircle className={className} />;
    case 'overdue':
      return <AlertCircle className={className} />;
    default:
      return <Circle className={className} />;
  }
};

const getSourceUrl = (sourceType?: string | null, sourceId?: string | null, _memberId?: string | null): string | null => {
  if (!sourceType || !sourceId) return null;

  switch (sourceType) {
    case 'member_care_plans':
      return `/admin/community/care-plans/manage?carePlanId=${sourceId}`;
    case 'member_discipleship_plans':
      return `/admin/community/discipleship-plans/manage?discipleshipPlanId=${sourceId}`;
    case 'member_birthday':
    case 'member_anniversary':
      return `/admin/community/membership/manage?memberId=${sourceId}`;
    default:
      return null;
  }
};

const getSourceLabel = (sourceType?: string | null): string => {
  switch (sourceType) {
    case 'member_care_plans':
      return 'Care Plan';
    case 'member_discipleship_plans':
      return 'Discipleship Plan';
    case 'member_birthday':
      return 'Birthday';
    case 'member_anniversary':
      return 'Wedding Anniversary';
    default:
      return 'Source';
  }
};

const formatFullDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

// Event Tooltip Content Component
const EventTooltipContent: React.FC<{ event: CalendarEvent }> = ({ event }) => {
  const sourceUrl = getSourceUrl(event.sourceType, event.sourceId, event.memberId);

  return (
    <div className="w-72 p-1">
      {/* Header with category color accent */}
      <div
        className="h-1.5 rounded-t-lg -mx-1 -mt-1 mb-3"
        style={{ backgroundColor: event.categoryColor }}
      />

      {/* Title and Type */}
      <div className="flex items-start gap-2 mb-3">
        <div
          className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${event.categoryColor}15` }}
        >
          <CategoryIcon iconName={event.categoryIcon} className="w-4 h-4" style={{ color: event.categoryColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-foreground line-clamp-2">{event.title}</h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4 capitalize"
              style={{ borderColor: event.categoryColor, color: event.categoryColor }}
            >
              {event.eventType.replace('_', ' ')}
            </Badge>
            {event.priority !== 'normal' && (
              <Badge variant={getPriorityBadgeVariant(event.priority)} className="text-[10px] px-1.5 py-0 h-4 capitalize">
                {event.priority}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="space-y-2 text-xs">
        {/* Date & Time */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            {formatDate(event.start)}
            {!event.allDay && ` • ${formatTime(event.start)}`}
            {event.end && ` - ${formatTime(event.end)}`}
          </span>
        </div>

        {/* Member */}
        {event.memberName && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate font-medium text-foreground">{event.memberName}</span>
          </div>
        )}

        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <StatusIcon status={event.status} className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="capitalize">{event.status}</span>
        </div>

        {/* Description preview */}
        {event.description && (
          <p className="text-muted-foreground line-clamp-2 pt-1 border-t border-border/50 mt-2">
            {event.description}
          </p>
        )}
      </div>

      {/* Tags */}
      {event.tags.length > 0 && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
          <Tag className="w-3 h-3 text-muted-foreground" />
          <div className="flex flex-wrap gap-1">
            {event.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Source link hint */}
      {sourceUrl && (
        <div className="mt-3 pt-2 border-t border-border/50 flex items-center gap-1 text-[10px] text-muted-foreground">
          <ExternalLink className="w-3 h-3" />
          <span>Click to view {getSourceLabel(event.sourceType).toLowerCase()} details</span>
        </div>
      )}
    </div>
  );
};

// Event Card Component
const EventCard: React.FC<{
  event: CalendarEvent;
  compact?: boolean;
  onClick?: () => void;
}> = ({ event, compact = false, onClick }) => {
  if (compact) {
    return (
      <HoverCard openDelay={300} closeDelay={100}>
        <HoverCardTrigger asChild>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className="group w-full text-left px-1.5 py-0.5 rounded text-xs truncate transition-all hover:opacity-80"
            style={{ backgroundColor: `${event.categoryColor}20`, color: event.categoryColor }}
          >
            <span className="font-medium truncate">{event.title}</span>
          </button>
        </HoverCardTrigger>
        <HoverCardContent
          side="right"
          align="start"
          className="p-0 overflow-hidden"
          sideOffset={8}
        >
          <EventTooltipContent event={event} />
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <HoverCard openDelay={400} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          onClick={onClick}
          className="group w-full text-left p-3 rounded-xl border border-border/50 bg-card hover:bg-accent/50 hover:border-border transition-all shadow-sm hover:shadow-md"
        >
          <div className="flex items-start gap-3">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${event.categoryColor}20` }}
            >
              <CategoryIcon iconName={event.categoryIcon} className="w-5 h-5" style={{ color: event.categoryColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm truncate text-foreground">{event.title}</h4>
                {event.priority !== 'normal' && (
                  <span
                    className={cn('w-2 h-2 rounded-full flex-shrink-0', getPriorityColor(event.priority))}
                  />
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {event.allDay ? 'All day' : formatTime(event.start)}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3" />
                    {event.location}
                  </span>
                )}
              </div>
              {event.memberName && (
                <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span className="truncate">{event.memberName}</span>
                </div>
              )}
            </div>
          </div>
          {event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 pl-13">
              {event.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        className="p-0 overflow-hidden"
        sideOffset={8}
      >
        <EventTooltipContent event={event} />
      </HoverCardContent>
    </HoverCard>
  );
};

// Day Cell Component
const DayCell: React.FC<{
  date: Date;
  events: CalendarEvent[];
  currentMonth: number;
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}> = ({ date, events, currentMonth, onEventClick, onDateClick }) => {
  const isCurrentMonth = date.getMonth() === currentMonth;
  const dayEvents = events.filter((e) => isSameDay(e.start, date));
  const displayEvents = dayEvents.slice(0, 3);
  const moreCount = dayEvents.length - 3;

  return (
    <div
      className={cn(
        'min-h-[100px] md:min-h-[120px] p-1 md:p-2 border-b border-r border-border/30 transition-colors',
        !isCurrentMonth && 'bg-muted/30',
        isToday(date) && 'bg-primary/5',
        'hover:bg-accent/30 cursor-pointer'
      )}
      onClick={() => onDateClick?.(date)}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            'text-xs md:text-sm font-medium w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full',
            isToday(date) && 'bg-primary text-primary-foreground',
            !isCurrentMonth && 'text-muted-foreground'
          )}
        >
          {date.getDate()}
        </span>
      </div>
      <div className="space-y-0.5">
        {displayEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            compact
            onClick={() => {
              onEventClick?.(event);
            }}
          />
        ))}
        {moreCount > 0 && (
          <span className="text-[10px] text-muted-foreground px-1">+{moreCount} more</span>
        )}
      </div>
    </div>
  );
};

// Helper to validate view mode from URL
const isValidViewMode = (view: string | null): view is ViewMode => {
  return view === 'month' || view === 'week' || view === 'day' || view === 'agenda';
};

// Main Calendar Component
export function PlanningCalendar({
  events: propEvents,
  categories: propCategories,
  isLoading: propIsLoading,
  initialView,
  backUrl = '/admin/community/planning',
  onEventClick,
  onDateSelect,
  onCreateEvent,
  onSync,
  onDateRangeChange,
}: PlanningCalendarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Self-contained state for when props are not provided
  const [selfEvents, setSelfEvents] = useState<CalendarEvent[]>([]);
  const [selfCategories, setSelfCategories] = useState<CalendarCategory[]>([]);
  const [selfIsLoading, setSelfIsLoading] = useState(false);
  const [isSelfContained] = useState(!propEvents && !onDateRangeChange);
  const currentRangeRef = React.useRef<string>('');

  // Use props if provided, otherwise use self-managed state
  const events = propEvents ?? selfEvents;
  const categories = propCategories ?? selfCategories;
  const isLoading = propIsLoading ?? selfIsLoading;

  // Get initial view from URL param, prop, or default to 'month'
  const getInitialView = (): ViewMode => {
    const urlView = searchParams.get('view');
    if (isValidViewMode(urlView)) return urlView;
    if (initialView) return initialView;
    return 'month';
  };

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialView);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Self-contained data fetching
  const fetchCalendarData = useCallback(async (startDate: Date, endDate: Date) => {
    if (!isSelfContained) return;

    // Create a key for this date range to avoid duplicate fetches
    const rangeKey = `${startDate.toISOString()}-${endDate.toISOString()}`;
    if (currentRangeRef.current === rangeKey) {
      return; // Already fetched this range
    }
    currentRangeRef.current = rangeKey;

    try {
      setSelfIsLoading(true);

      const response = await fetch(
        `/api/community/planning/calendar?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch calendar data');
      }

      const result = await response.json();

      // Transform events to have Date objects
      const fetchedEvents = result.events.map((event: { start: string | Date; end: string | Date | null; [key: string]: unknown }) => ({
        ...event,
        start: new Date(event.start),
        end: event.end ? new Date(event.end) : null,
      }));

      setSelfEvents(fetchedEvents);
      setSelfCategories(result.categories || []);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setSelfIsLoading(false);
    }
  }, [isSelfContained]);

  // Self-contained sync handler
  const handleSelfSync = useCallback(async () => {
    try {
      setIsSyncing(true);
      const response = await fetch('/api/community/planning/sync', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to sync events');
      }

      // Refresh calendar data - clear range key to force refetch
      currentRangeRef.current = '';

      // Trigger refetch based on current view
      let startDate: Date;
      let endDate: Date;

      if (viewMode === 'month') {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - startDate.getDay());
        endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
      } else if (viewMode === 'week') {
        startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - currentDate.getDay());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
      } else if (viewMode === 'day') {
        startDate = new Date(currentDate);
        endDate = new Date(currentDate);
      } else {
        startDate = new Date();
        endDate = new Date();
        endDate.setDate(endDate.getDate() + 90);
      }

      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      await fetchCalendarData(startDate, endDate);
    } catch (error) {
      console.error('Error syncing events:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [viewMode, currentDate, fetchCalendarData]);

  // Auto-sync on initial load for self-contained mode
  const hasInitialSyncRef = React.useRef(false);
  useEffect(() => {
    if (isSelfContained && !hasInitialSyncRef.current) {
      hasInitialSyncRef.current = true;
      // Trigger sync on initial load to ensure events from care plans,
      // discipleship plans, birthdays, and anniversaries are up-to-date
      handleSelfSync();
    }
  }, [isSelfContained, handleSelfSync]);

  // Update URL when view mode changes
  const handleViewModeChange = useCallback((newView: ViewMode) => {
    setViewMode(newView);
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', newView);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  // Sync view mode with URL on initial load and URL changes
  useEffect(() => {
    const urlView = searchParams.get('view');
    if (isValidViewMode(urlView) && urlView !== viewMode) {
      setViewMode(urlView);
    }
  }, [searchParams, viewMode]);

  // Calculate date range based on current view and notify parent or fetch data
  useEffect(() => {
    let startDate: Date;
    let endDate: Date;

    if (viewMode === 'month') {
      // For month view, get the full calendar grid (includes days from prev/next month)
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      // Start from Sunday of the week containing the first day
      startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - startDate.getDay());

      // End on Saturday of the week containing the last day
      endDate = new Date(lastDay);
      endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    } else if (viewMode === 'week') {
      // For week view, get the current week
      startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - currentDate.getDay());
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else if (viewMode === 'day') {
      // For day view, just the current day
      startDate = new Date(currentDate);
      endDate = new Date(currentDate);
    } else {
      // Agenda view - get next 90 days
      startDate = new Date();
      endDate = new Date();
      endDate.setDate(endDate.getDate() + 90);
    }

    // Set times to start/end of day
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Either notify parent or fetch data ourselves
    if (onDateRangeChange) {
      onDateRangeChange(startDate, endDate);
    } else if (isSelfContained) {
      fetchCalendarData(startDate, endDate);
    }
  }, [currentDate, viewMode, onDateRangeChange, isSelfContained, fetchCalendarData]);

  // Filter events by selected categories
  const filteredEvents = useMemo(() => {
    if (selectedCategories.length === 0) return events;
    return events.filter((e) => e.categoryId && selectedCategories.includes(e.categoryId));
  }, [events, selectedCategories]);

  // Navigation
  const goToPrevious = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (viewMode === 'month') {
        newDate.setMonth(prev.getMonth() - 1);
      } else if (viewMode === 'week') {
        newDate.setDate(prev.getDate() - 7);
      } else {
        newDate.setDate(prev.getDate() - 1);
      }
      return newDate;
    });
  }, [viewMode]);

  const goToNext = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (viewMode === 'month') {
        newDate.setMonth(prev.getMonth() + 1);
      } else if (viewMode === 'week') {
        newDate.setDate(prev.getDate() + 7);
      } else {
        newDate.setDate(prev.getDate() + 1);
      }
      return newDate;
    });
  }, [viewMode]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleSync = useCallback(async () => {
    if (!onSync) return;
    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setIsSyncing(false);
    }
  }, [onSync]);

  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      setSelectedEvent(event);
      onEventClick?.(event);
    },
    [onEventClick]
  );

  const handleDateClick = useCallback(
    (date: Date) => {
      onDateSelect?.(date);
    },
    [onDateSelect]
  );

  const toggleCategory = useCallback((categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  }, []);

  // Get days for current view
  const days = useMemo(() => {
    if (viewMode === 'month') return getDaysInMonth(currentDate);
    if (viewMode === 'week') return getWeekDays(currentDate);
    return [currentDate];
  }, [currentDate, viewMode]);

  // Get upcoming events for agenda view
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return filteredEvents
      .filter((e) => e.start >= now)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 20);
  }, [filteredEvents]);

  // Header title
  const headerTitle = useMemo(() => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return currentDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [currentDate, viewMode]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <Skeleton className="h-[600px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back button - shown above calendar when backUrl is provided */}
      {backUrl && (
        <div className="flex items-center">
          <Link href={backUrl}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      )}

      {/* Title section - shown in self-contained mode */}
      {isSelfContained && (
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Planning Calendar</h1>
          <p className="text-muted-foreground">
            Central view for all upcoming events, care plans, and discipleship milestones.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold min-w-[200px] text-center">{headerTitle}</h2>
          <Button variant="outline" size="icon" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Selector */}
          <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('month')}
              className="h-7 px-2.5"
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Month</span>
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('week')}
              className="h-7 px-2.5"
            >
              <CalendarIcon className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Week</span>
            </Button>
            <Button
              variant={viewMode === 'agenda' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('agenda')}
              className="h-7 px-2.5"
            >
              <List className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Agenda</span>
            </Button>
          </div>

          {/* Category Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filter
                {selectedCategories.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {selectedCategories.length}
                  </Badge>
                )}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {categories.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category.id}
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={() => toggleCategory(category.id)}
                >
                  <span
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.name}
                </DropdownMenuCheckboxItem>
              ))}
              {selectedCategories.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSelectedCategories([])}>
                    Clear filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sync Button - show for both prop-based and self-contained mode */}
          {(onSync || isSelfContained) && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSync ? handleSync : handleSelfSync}
              disabled={isSyncing}
            >
              {isSyncing ? 'Syncing...' : 'Sync'}
            </Button>
          )}

          {/* Create Event Button - show for both prop-based and self-contained mode */}
          {(onCreateEvent || isSelfContained) && (
            <Button
              size="sm"
              onClick={onCreateEvent || (() => router.push('/admin/community/planning/manage'))}
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Add Event</span>
            </Button>
          )}
        </div>
      </div>

      {/* Category Legend */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {categories.slice(0, 6).map((category) => (
            <div key={category.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CategoryIcon iconName={category.icon} className="w-3 h-3" style={{ color: category.color }} />
              <span>{category.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Calendar Views */}
      {(viewMode === 'month' || viewMode === 'week') && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="py-2 px-2 text-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {days.map((day, index) => (
              <DayCell
                key={index}
                date={day}
                events={filteredEvents}
                currentMonth={currentDate.getMonth()}
                onEventClick={handleEventClick}
                onDateClick={handleDateClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Agenda View */}
      {viewMode === 'agenda' && (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Upcoming Events</h3>
            <p className="text-sm text-muted-foreground">
              {upcomingEvents.length} events scheduled
            </p>
          </div>
          <ScrollArea className="h-[500px]">
            <div className="p-4 space-y-3">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No upcoming events</p>
                  <p className="text-sm">Events from care plans and discipleship will appear here</p>
                </div>
              ) : (
                upcomingEvents.map((event) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex-shrink-0 w-16 text-center">
                      <div className="text-xs text-muted-foreground">
                        {event.start.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-lg font-semibold">{event.start.getDate()}</div>
                      <div className="text-xs text-muted-foreground">
                        {event.start.toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                    </div>
                    <div className="flex-1">
                      <EventCard event={event} onClick={() => handleEventClick(event)} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Event Detail Dialog - Modern Mobile-First Design */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          {selectedEvent && (
            <>
              {/* Colored Header Banner */}
              <div
                className="h-24 sm:h-28 relative"
                style={{
                  background: `linear-gradient(135deg, ${selectedEvent.categoryColor} 0%, ${selectedEvent.categoryColor}dd 100%)`,
                }}
              >
                {/* Decorative pattern overlay */}
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  }}
                />

                {/* Floating icon */}
                <div className="absolute -bottom-6 left-6">
                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shadow-lg flex items-center justify-center bg-card border-4 border-background"
                  >
                    <CategoryIcon iconName={selectedEvent.categoryIcon} className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: selectedEvent.categoryColor }} />
                  </div>
                </div>

                {/* Priority indicator */}
                {selectedEvent.priority !== 'normal' && (
                  <div className="absolute top-4 right-4">
                    <Badge
                      variant={getPriorityBadgeVariant(selectedEvent.priority)}
                      className="text-xs font-semibold shadow-sm capitalize"
                    >
                      {selectedEvent.priority} Priority
                    </Badge>
                  </div>
                )}
              </div>

              {/* Content Area */}
              <div className="px-6 pt-10 pb-6">
                {/* Title & Type */}
                <DialogHeader className="space-y-2 text-left">
                  <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight pr-8">
                    {selectedEvent.title}
                  </DialogTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="capitalize"
                      style={{ borderColor: selectedEvent.categoryColor, color: selectedEvent.categoryColor }}
                    >
                      {selectedEvent.eventType.replace('_', ' ')}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <StatusIcon status={selectedEvent.status} className="w-4 h-4" />
                      <span className="capitalize">{selectedEvent.status}</span>
                    </div>
                  </div>
                </DialogHeader>

                <Separator className="my-5" />

                {/* Details Section */}
                <div className="space-y-4">
                  {/* Date & Time Card */}
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${selectedEvent.categoryColor}15` }}
                    >
                      <CalendarIcon className="w-5 h-5" style={{ color: selectedEvent.categoryColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{formatFullDate(selectedEvent.start)}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {selectedEvent.allDay ? (
                          'All day event'
                        ) : (
                          <>
                            {formatTime(selectedEvent.start)}
                            {selectedEvent.end && ` - ${formatTime(selectedEvent.end)}`}
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Member Info Card */}
                  {selectedEvent.memberName && (
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${selectedEvent.categoryColor}15` }}
                      >
                        <User className="w-5 h-5" style={{ color: selectedEvent.categoryColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Member</p>
                        <p className="font-semibold text-base mt-0.5">{selectedEvent.memberName}</p>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {selectedEvent.location && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span>{selectedEvent.location}</span>
                    </div>
                  )}

                  {/* Assigned To */}
                  {selectedEvent.assignedToName && (
                    <div className="flex items-center gap-3 text-sm">
                      <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span>Assigned to <span className="font-medium">{selectedEvent.assignedToName}</span></span>
                    </div>
                  )}

                  {/* Description */}
                  {selectedEvent.description && (
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Description</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {selectedEvent.description}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedEvent.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedEvent.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Source Plan Link - CTA Section */}
                {getSourceUrl(selectedEvent.sourceType, selectedEvent.sourceId, selectedEvent.memberId) && (
                  <>
                    <Separator className="my-5" />
                    <div
                      className="p-4 rounded-xl border-2 border-dashed transition-colors hover:border-primary/50"
                      style={{ borderColor: `${selectedEvent.categoryColor}40` }}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${selectedEvent.categoryColor}15` }}
                          >
                            {selectedEvent.sourceType === 'member_care_plans' ? (
                              <Heart className="w-5 h-5" style={{ color: selectedEvent.categoryColor }} />
                            ) : (
                              <BookOpen className="w-5 h-5" style={{ color: selectedEvent.categoryColor }} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Source</p>
                            <p className="font-semibold text-sm truncate">{getSourceLabel(selectedEvent.sourceType)}</p>
                          </div>
                        </div>
                        <Button
                          asChild
                          size="sm"
                          className="flex-shrink-0 gap-1.5"
                          style={{
                            backgroundColor: selectedEvent.categoryColor,
                            color: 'white',
                          }}
                        >
                          <Link href={getSourceUrl(selectedEvent.sourceType, selectedEvent.sourceId, selectedEvent.memberId)!}>
                            View Plan
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedEvent(null)}
                  >
                    Close
                  </Button>
                  {getSourceUrl(selectedEvent.sourceType, selectedEvent.sourceId, selectedEvent.memberId) && (
                    <Button
                      asChild
                      size="sm"
                      variant="default"
                    >
                      <Link href={getSourceUrl(selectedEvent.sourceType, selectedEvent.sourceId, selectedEvent.memberId)!}>
                        <ExternalLink className="w-4 h-4 mr-1.5" />
                        Open {getSourceLabel(selectedEvent.sourceType)}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PlanningCalendar;
