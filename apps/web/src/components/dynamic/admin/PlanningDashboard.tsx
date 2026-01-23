'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Target,
  Users,
  ArrowRight,
  Clock,
  Heart,
  BookOpen,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ClipboardList,
  MapPin,
  User,
  ExternalLink,
  Tag,
  Circle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface DashboardStats {
  totalEvents: number;
  upcomingEvents: number;
  carePlanEvents: number;
  discipleshipEvents: number;
  completedThisWeek: number;
  overdueEvents: number;
}

interface UpcomingEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start: Date;
  end?: Date | null;
  allDay?: boolean;
  eventType: string;
  categoryColor: string;
  categoryIcon?: string | null;
  priority: string;
  status?: string;
  sourceType?: string | null;
  sourceId?: string | null;
  memberId?: string | null;
  memberName?: string | null;
  assignedToName?: string | null;
  tags?: string[];
}

// Feature card for navigation
interface FeatureCard {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge?: string;
  comingSoon?: boolean;
}

export interface PlanningDashboardProps {
  // Props can be passed from metadata but the component fetches its own data
  className?: string;
}

const featureCards: FeatureCard[] = [
  {
    title: 'Calendar',
    description: 'View and manage all events, follow-ups, and milestones in one unified calendar.',
    href: '/admin/community/planning/calendar',
    icon: CalendarDays,
    color: 'bg-blue-500',
  },
  {
    title: 'Scheduler',
    description: 'Manage ministry schedules, worship services, events with registrations and QR attendance.',
    href: '/admin/community/planning/scheduler',
    icon: ClipboardList,
    color: 'bg-orange-500',
  },
  {
    title: 'Goals & Objectives',
    description: 'Set and track church-wide goals, ministry objectives, and key results.',
    href: '/admin/community/planning/goals',
    icon: Target,
    color: 'bg-purple-500',
  },
  // {
  //   title: 'Attendance',
  //   description: 'Track service and event attendance, analyze trends, and manage capacity.',
  //   href: '/admin/community/planning/attendance',
  //   icon: Users,
  //   color: 'bg-green-500',
  //   comingSoon: true,
  // },
];

// Helper functions for event display
const getSourceUrl = (sourceType?: string | null, sourceId?: string | null): string | null => {
  if (!sourceType || !sourceId) return null;
  switch (sourceType) {
    case 'member_care_plans':
      return `/admin/community/care-plans/manage?carePlanId=${sourceId}`;
    case 'member_discipleship_plans':
      return `/admin/community/discipleship-plans/manage?discipleshipPlanId=${sourceId}`;
    case 'member_birthday':
    case 'member_anniversary':
      return `/admin/community/members/${sourceId}/view`;
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

const formatFullDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
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

// Render category icon based on icon name
function renderCategoryIcon(iconName: string | null | undefined, className: string, style?: React.CSSProperties) {
  switch (iconName) {
    case 'heart':
      return <Heart className={className} style={style} />;
    case 'book-open':
      return <BookOpen className={className} style={style} />;
    case 'users':
      return <Users className={className} style={style} />;
    case 'calendar':
      return <Calendar className={className} style={style} />;
    default:
      return <Circle className={className} style={style} />;
  }
}

// Render status icon based on status
function renderStatusIcon(status: string | undefined, className: string) {
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
}

// Render event type icon
function renderEventTypeIcon(eventType: string, className: string, style?: React.CSSProperties) {
  switch (eventType) {
    case 'care_plan':
      return <Heart className={className} style={style} />;
    case 'discipleship':
      return <BookOpen className={className} style={style} />;
    default:
      return <Calendar className={className} style={style} />;
  }
}

// Event tooltip content for hover card
const EventTooltipContent: React.FC<{ event: UpcomingEvent }> = ({ event }) => {
  const sourceUrl = getSourceUrl(event.sourceType, event.sourceId);

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
          {renderCategoryIcon(event.categoryIcon, "w-4 h-4", { color: event.categoryColor })}
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
            {!event.allDay && ` - ${formatTime(event.start)}`}
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
        {event.status && (
          <div className="flex items-center gap-2 text-muted-foreground">
            {renderStatusIcon(event.status, "w-3.5 h-3.5 flex-shrink-0")}
            <span className="capitalize">{event.status}</span>
          </div>
        )}

        {/* Description preview */}
        {event.description && (
          <p className="text-muted-foreground line-clamp-2 pt-1 border-t border-border/50 mt-2">
            {event.description}
          </p>
        )}
      </div>

      {/* Tags */}
      {event.tags && event.tags.length > 0 && (
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

// Stat card component
function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendUp,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <Card className={cn(
      "group relative overflow-hidden",
      "border-border/40 bg-card/50 backdrop-blur-sm",
      "transition-all duration-300",
      "hover:border-border hover:shadow-lg hover:shadow-primary/5"
    )}>
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/30" />

      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-2xl sm:text-3xl font-bold text-foreground">{value}</div>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{description}</p>
        {trend && (
          <div className={cn(
            'text-xs mt-2 font-medium flex items-center gap-1',
            trendUp
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-destructive'
          )}>
            {trendUp ? '+' : ''}{trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Feature card component
function FeatureCardComponent({ card }: { card: FeatureCard }) {
  const Icon = card.icon;

  if (card.comingSoon) {
    return (
      <Card className={cn(
        "relative overflow-hidden",
        "border-border/40 bg-card/30 backdrop-blur-sm",
        "opacity-75"
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/30" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div
              className={cn(
                'w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center',
                'ring-2 ring-white/20',
                card.color
              )}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
          </div>
          <CardTitle className="mt-4 text-base sm:text-lg">{card.title}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{card.description}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Link href={card.href} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl">
      <Card className={cn(
        "relative overflow-hidden h-full",
        "border-border/40 bg-card/50 backdrop-blur-sm",
        "transition-all duration-300",
        "hover:border-border hover:shadow-lg hover:shadow-primary/5",
        "active:scale-[0.99]"
      )}>
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div
              className={cn(
                'w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center',
                'ring-2 ring-white/20 shadow-lg',
                'transition-transform duration-300 group-hover:scale-110',
                card.color
              )}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
          </div>
          <CardTitle className="mt-4 text-base sm:text-lg group-hover:text-primary transition-colors duration-300">
            {card.title}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">{card.description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}

// Upcoming event item with hover card and click to open dialog
function UpcomingEventItem({ event, onClick }: { event: UpcomingEvent; onClick: () => void }) {
  const isToday = new Date(event.start).toDateString() === new Date().toDateString();

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          onClick={onClick}
          className="flex items-center gap-3 py-2 w-full text-left hover:bg-accent/50 rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${event.categoryColor}20` }}
          >
            {renderEventTypeIcon(event.eventType, "w-4 h-4", { color: event.categoryColor })}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{event.title}</p>
            <p className="text-xs text-muted-foreground">
              {isToday ? 'Today' : new Date(event.start).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
              {' at '}
              {new Date(event.start).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
          {event.priority === 'urgent' && (
            <Badge variant="destructive" className="flex-shrink-0">Urgent</Badge>
          )}
          {event.priority === 'high' && (
            <Badge variant="default" className="flex-shrink-0">High</Badge>
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
}

// Overdue event item with red styling and days overdue indicator
function OverdueEventItem({ event, onClick }: { event: UpcomingEvent; onClick: () => void }) {
  const eventDate = new Date(event.start);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);
  const daysOverdue = Math.floor((today.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          onClick={onClick}
          className="flex items-center gap-3 py-2 w-full text-left hover:bg-red-50/50 dark:hover:bg-red-950/30 rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-100 dark:bg-red-950/50"
          >
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-red-700 dark:text-red-400">{event.title}</p>
            <p className="text-xs text-red-600 dark:text-red-500">
              {daysOverdue === 0 ? 'Due today' : daysOverdue === 1 ? '1 day overdue' : `${daysOverdue} days overdue`}
              {event.memberName && ` • ${event.memberName}`}
            </p>
          </div>
          <Badge variant="destructive" className="flex-shrink-0 text-[10px] px-1.5 py-0.5">
            Overdue
          </Badge>
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="left"
        align="start"
        className="p-0 overflow-hidden"
        sideOffset={8}
      >
        <EventTooltipContent event={event} />
      </HoverCardContent>
    </HoverCard>
  );
}

export function PlanningDashboard({ className }: PlanningDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [overdueEvents, setOverdueEvents] = useState<UpcomingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<UpcomingEvent | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const now = new Date();
      const endDate = new Date();
      endDate.setDate(now.getDate() + 7);

      const response = await fetch(
        `/api/community/planning/calendar?startDate=${now.toISOString()}&endDate=${endDate.toISOString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch planning data');
      }

      const result = await response.json();

      // Set stats
      setStats(result.stats || {
        totalEvents: 0,
        upcomingEvents: 0,
        carePlanEvents: 0,
        discipleshipEvents: 0,
        completedThisWeek: 0,
        overdueEvents: 0,
      });

      // Set upcoming events
      const events = (result.events || []).map((event: { start: string | Date; [key: string]: unknown }) => ({
        ...event,
        start: new Date(event.start),
      })).slice(0, 5);
      setUpcomingEvents(events);

      // Set overdue events
      const overdue = (result.overdueEvents || []).map((event: { start: string | Date; [key: string]: unknown }) => ({
        ...event,
        start: new Date(event.start),
      }));
      setOverdueEvents(overdue);
    } catch (error) {
      console.error('Error fetching planning data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load planning data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleSync = useCallback(async () => {
    try {
      setIsSyncing(true);
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

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error syncing events:', error);
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync events from care plans and discipleship.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [fetchData, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className={cn("space-y-8", className)}>
      {/* Title Section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Planning Dashboard</h1>
        <p className="text-muted-foreground">
          Central hub for church planning, calendar management, and goal tracking.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Upcoming Events"
          value={stats?.upcomingEvents || 0}
          description="Events in the next 7 days"
          icon={Calendar}
        />
        <StatCard
          title="Care Plan Follow-ups"
          value={stats?.carePlanEvents || 0}
          description="Pastoral care scheduled"
          icon={Heart}
        />
        <StatCard
          title="Discipleship Milestones"
          value={stats?.discipleshipEvents || 0}
          description="Growth journey checkpoints"
          icon={BookOpen}
        />
        <StatCard
          title="Completed This Week"
          value={stats?.completedThisWeek || 0}
          description="Events marked complete"
          icon={CheckCircle2}
        />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSync} disabled={isSyncing} variant="outline">
          <RefreshCw className={cn('w-4 h-4 mr-2', isSyncing && 'animate-spin')} />
          {isSyncing ? 'Syncing...' : 'Sync from Plans'}
        </Button>
        <Button asChild>
          <Link href="/admin/community/planning/calendar">
            <CalendarDays className="w-4 h-4 mr-2" />
            Open Calendar
          </Link>
        </Button>
      </div>

      {/* Feature Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Planning Tools</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((card) => (
            <FeatureCardComponent key={card.title} card={card} />
          ))}
        </div>
      </div>

      {/* Upcoming Events & Alerts */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {/* Upcoming Events */}
        <Card className={cn(
          "relative overflow-hidden",
          "border-border/40 bg-card/50 backdrop-blur-sm",
          "transition-all duration-300",
          "hover:border-border"
        )}>
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500/50" />

          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20">
                  <Calendar className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Upcoming This Week</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Care plan follow-ups and discipleship milestones
                  </CardDescription>
                </div>
              </div>
              <Link href="/admin/community/planning/calendar?view=week">
                <Button variant="ghost" size="sm" className="gap-1.5 hover:bg-blue-500/5 hover:text-blue-600 dark:hover:text-blue-400">
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No upcoming events</p>
                <p className="text-sm">Sync from care plans to populate</p>
              </div>
            ) : (
              <div className="divide-y">
                {upcomingEvents.map((event) => (
                  <UpcomingEventItem key={event.id} event={event} onClick={() => setSelectedEvent(event)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts / Overdue */}
        <Card className={cn(
          "relative overflow-hidden",
          "border-border/40 bg-card/50 backdrop-blur-sm",
          "transition-all duration-300",
          "hover:border-border"
        )}>
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500/50" />

          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Needs Attention</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Overdue items and urgent priorities
                  </CardDescription>
                </div>
              </div>
              {overdueEvents.length > 0 && (
                <Link href="/admin/community/planning/calendar?filter=overdue">
                  <Button variant="ghost" size="sm" className="gap-1.5 hover:bg-amber-500/5 hover:text-amber-600 dark:hover:text-amber-400">
                    View All
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : overdueEvents.length > 0 ? (
              <div className="space-y-3">
                {/* Summary banner */}
                <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-700 dark:text-red-400">
                      {stats?.overdueEvents || overdueEvents.length} overdue {(stats?.overdueEvents || overdueEvents.length) === 1 ? 'item' : 'items'}
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-500">
                      Requiring immediate attention
                    </p>
                  </div>
                </div>
                {/* List of overdue events */}
                <div className="divide-y">
                  {overdueEvents.map((event) => (
                    <OverdueEventItem key={event.id} event={event} onClick={() => setSelectedEvent(event)} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500 opacity-70" />
                <p className="text-green-600 dark:text-green-400 font-medium">All caught up!</p>
                <p className="text-sm">No overdue items requiring attention</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          {selectedEvent && (() => {
            const sourceUrl = getSourceUrl(selectedEvent.sourceType, selectedEvent.sourceId);
            const sourceLabel = getSourceLabel(selectedEvent.sourceType);

            return (
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
                      {renderCategoryIcon(selectedEvent.categoryIcon, "w-7 h-7 sm:w-8 sm:h-8", { color: selectedEvent.categoryColor })}
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
                      {selectedEvent.status && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          {renderStatusIcon(selectedEvent.status, "w-4 h-4")}
                          <span className="capitalize">{selectedEvent.status}</span>
                        </div>
                      )}
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
                        <Calendar className="w-5 h-5" style={{ color: selectedEvent.categoryColor }} />
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
                    {selectedEvent.tags && selectedEvent.tags.length > 0 && (
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
                  {sourceUrl && (
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
                              <p className="font-semibold text-sm truncate">{sourceLabel}</p>
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
                            <Link href={sourceUrl}>
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
                    {sourceUrl && (
                      <Button
                        asChild
                        size="sm"
                        variant="default"
                      >
                        <Link href={sourceUrl}>
                          <ExternalLink className="w-4 h-4 mr-1.5" />
                          Open {sourceLabel}
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
