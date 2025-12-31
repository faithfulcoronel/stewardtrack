'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Target,
  Users,
  TrendingUp,
  ArrowRight,
  Clock,
  Heart,
  BookOpen,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

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
  start: Date;
  eventType: string;
  categoryColor: string;
  priority: string;
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

const featureCards: FeatureCard[] = [
  {
    title: 'Calendar',
    description: 'View and manage all events, follow-ups, and milestones in one unified calendar.',
    href: '/admin/community/planning/calendar',
    icon: CalendarDays,
    color: 'bg-blue-500',
  },
  {
    title: 'Goals & Objectives',
    description: 'Set and track church-wide goals, ministry objectives, and key results.',
    href: '/admin/community/planning/goals',
    icon: Target,
    color: 'bg-purple-500',
    comingSoon: true,
  },
  {
    title: 'Attendance',
    description: 'Track service and event attendance, analyze trends, and manage capacity.',
    href: '/admin/community/planning/attendance',
    icon: Users,
    color: 'bg-green-500',
    comingSoon: true,
  },
];

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <div className={cn('text-xs mt-1', trendUp ? 'text-green-600' : 'text-red-600')}>
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
      <Card className="relative overflow-hidden opacity-75">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/30" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div
              className={cn('w-10 h-10 rounded-lg flex items-center justify-center', card.color)}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
          <CardTitle className="mt-4">{card.title}</CardTitle>
          <CardDescription>{card.description}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Link href={card.href}>
      <Card className="group hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div
              className={cn('w-10 h-10 rounded-lg flex items-center justify-center', card.color)}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
          <CardTitle className="mt-4">{card.title}</CardTitle>
          <CardDescription>{card.description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}

// Upcoming event item
function UpcomingEventItem({ event }: { event: UpcomingEvent }) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'care_plan':
        return Heart;
      case 'discipleship':
        return BookOpen;
      default:
        return Calendar;
    }
  };

  const Icon = getEventIcon(event.eventType);
  const isToday = new Date(event.start).toDateString() === new Date().toDateString();

  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${event.categoryColor}20` }}
      >
        <Icon className="w-4 h-4" style={{ color: event.categoryColor }} />
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
    </div>
  );
}

export function PlanningDashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
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
    <div className="space-y-8">
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
      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming This Week</CardTitle>
                <CardDescription>
                  Care plan follow-ups and discipleship milestones
                </CardDescription>
              </div>
              <Link href="/admin/community/planning/calendar?view=week">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
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
                  <UpcomingEventItem key={event.id} event={event} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts / Overdue */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Needs Attention</CardTitle>
                <CardDescription>
                  Overdue items and urgent priorities
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.overdueEvents && stats.overdueEvents > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="font-medium text-red-700 dark:text-red-400">
                      {stats.overdueEvents} overdue {stats.overdueEvents === 1 ? 'event' : 'events'}
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-500">
                      Past follow-ups requiring immediate attention
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/admin/community/planning/calendar?filter=overdue">
                    View Overdue Items
                  </Link>
                </Button>
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
    </div>
  );
}
