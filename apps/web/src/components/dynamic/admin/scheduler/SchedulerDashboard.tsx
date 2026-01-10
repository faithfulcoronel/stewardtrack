'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Users,
  ArrowRight,
  Clock,
  RefreshCw,
  CheckCircle2,
  Calendar,
  ClipboardList,
  MapPin,
  UserCheck,
  QrCode,
  CalendarPlus,
  Building2,
  AlertCircle,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface DashboardStats {
  totalMinistries: number;
  activeSchedules: number;
  upcomingOccurrences: number;
  todayOccurrences: number;
  totalRegistrations: number;
  checkedInToday: number;
}

interface UpcomingOccurrence {
  id: string;
  title: string;
  scheduleName: string;
  ministryName: string;
  ministryCode: string;
  startTime: Date;
  endTime: Date;
  location?: string | null;
  status: string;
  registrationCount: number;
  attendanceCount: number;
  capacity?: number | null;
}

interface FeatureCard {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge?: string;
  comingSoon?: boolean;
}

export interface SchedulerDashboardProps {
  className?: string;
}

const featureCards: FeatureCard[] = [
  {
    title: 'Ministries',
    description: 'Manage ministry groups and their team members with roles.',
    href: '/admin/community/planning/scheduler/ministries',
    icon: Building2,
    color: 'bg-blue-500',
  },
  {
    title: 'Schedules',
    description: 'Create and manage recurring schedules for events and services.',
    href: '/admin/community/planning/scheduler/schedules',
    icon: CalendarDays,
    color: 'bg-purple-500',
  },
  {
    title: 'Occurrences',
    description: 'View and manage specific event instances and their details.',
    href: '/admin/community/planning/scheduler/occurrences',
    icon: Calendar,
    color: 'bg-green-500',
  },
  {
    title: 'Check-In Station',
    description: 'QR-based attendance tracking and manual check-in for events.',
    href: '/admin/community/planning/scheduler/checkin',
    icon: QrCode,
    color: 'bg-orange-500',
  },
];

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

const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'in_progress':
      return 'default';
    case 'completed':
      return 'secondary';
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
};

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
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
      </CardContent>
    </Card>
  );
}

function FeatureCardComponent({ card }: { card: FeatureCard }) {
  const Icon = card.icon;

  if (card.comingSoon) {
    return (
      <Card className="relative overflow-hidden opacity-75">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/30" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', card.color)}>
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
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', card.color)}>
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

function OccurrenceItem({
  occurrence,
  onClick,
}: {
  occurrence: UpcomingOccurrence;
  onClick: () => void;
}) {
  const isToday = new Date(occurrence.startTime).toDateString() === new Date().toDateString();
  const isInProgress = occurrence.status === 'in_progress';

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 py-3 w-full text-left hover:bg-accent/50 rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
    >
      <div
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
          isInProgress ? 'bg-green-100 dark:bg-green-950/50' : 'bg-muted'
        )}
      >
        {isInProgress ? (
          <Play className="w-5 h-5 text-green-600" />
        ) : (
          <Calendar className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{occurrence.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {occurrence.ministryName} - {occurrence.scheduleName}
        </p>
        <p className="text-xs text-muted-foreground">
          {isToday ? 'Today' : formatDate(occurrence.startTime)} at {formatTime(occurrence.startTime)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Badge variant={getStatusBadgeVariant(occurrence.status)} className="text-xs capitalize">
          {occurrence.status.replace('_', ' ')}
        </Badge>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ClipboardList className="w-3 h-3" />
            {occurrence.registrationCount}
          </span>
          <span className="flex items-center gap-1">
            <UserCheck className="w-3 h-3" />
            {occurrence.attendanceCount}
          </span>
        </div>
      </div>
    </button>
  );
}

export function SchedulerDashboard({ className }: SchedulerDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingOccurrences, setUpcomingOccurrences] = useState<UpcomingOccurrence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOccurrence, setSelectedOccurrence] = useState<UpcomingOccurrence | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/community/scheduler');

      if (!response.ok) {
        throw new Error('Failed to fetch scheduler data');
      }

      const result = await response.json();

      setStats(result.data?.stats || {
        totalMinistries: 0,
        activeSchedules: 0,
        upcomingOccurrences: 0,
        todayOccurrences: 0,
        totalRegistrations: 0,
        checkedInToday: 0,
      });

      const occurrences = (result.data?.upcomingOccurrences || []).map(
        (occ: { startTime: string; endTime: string; [key: string]: unknown }) => ({
          ...occ,
          startTime: new Date(occ.startTime),
          endTime: new Date(occ.endTime),
        })
      );
      setUpcomingOccurrences(occurrences);
    } catch (error) {
      console.error('Error fetching scheduler data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load scheduler data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className={cn('space-y-8', className)}>
      {/* Title Section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Scheduler Dashboard</h1>
        <p className="text-muted-foreground">
          Manage ministry schedules, registrations, and attendance tracking.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ministries"
          value={stats?.totalMinistries || 0}
          description="Active ministry groups"
          icon={Building2}
        />
        <StatCard
          title="Active Schedules"
          value={stats?.activeSchedules || 0}
          description="Recurring event schedules"
          icon={CalendarDays}
        />
        <StatCard
          title="Upcoming Events"
          value={stats?.upcomingOccurrences || 0}
          description="Events in the next 7 days"
          icon={Calendar}
        />
        <StatCard
          title="Checked In Today"
          value={stats?.checkedInToday || 0}
          description="Attendees checked in"
          icon={UserCheck}
        />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={fetchData} variant="outline" disabled={isLoading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
        <Button asChild>
          <Link href="/admin/community/planning/scheduler/schedules/manage">
            <CalendarPlus className="w-4 h-4 mr-2" />
            Create Schedule
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/community/planning/scheduler/checkin">
            <QrCode className="w-4 h-4 mr-2" />
            Open Check-In
          </Link>
        </Button>
      </div>

      {/* Feature Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Scheduler Tools</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((card) => (
            <FeatureCardComponent key={card.title} card={card} />
          ))}
        </div>
      </div>

      {/* Upcoming Occurrences */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Events</CardTitle>
                <CardDescription>Next scheduled occurrences</CardDescription>
              </div>
              <Link href="/admin/community/planning/scheduler/occurrences">
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
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : upcomingOccurrences.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No upcoming events</p>
                <p className="text-sm">Create a schedule to generate occurrences</p>
              </div>
            ) : (
              <div className="divide-y">
                {upcomingOccurrences.slice(0, 5).map((occurrence) => (
                  <OccurrenceItem
                    key={occurrence.id}
                    occurrence={occurrence}
                    onClick={() => setSelectedOccurrence(occurrence)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Events */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Today&apos;s Events</CardTitle>
                <CardDescription>Events happening today</CardDescription>
              </div>
              {stats?.todayOccurrences && stats.todayOccurrences > 0 && (
                <Badge variant="default">{stats.todayOccurrences} events</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : (stats?.todayOccurrences || 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500 opacity-70" />
                <p className="text-green-600 dark:text-green-400 font-medium">No events today</p>
                <p className="text-sm">Check back for upcoming events</p>
              </div>
            ) : (
              <div className="divide-y">
                {upcomingOccurrences
                  .filter(
                    (occ) => new Date(occ.startTime).toDateString() === new Date().toDateString()
                  )
                  .map((occurrence) => (
                    <OccurrenceItem
                      key={occurrence.id}
                      occurrence={occurrence}
                      onClick={() => setSelectedOccurrence(occurrence)}
                    />
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Occurrence Detail Dialog */}
      <Dialog open={!!selectedOccurrence} onOpenChange={() => setSelectedOccurrence(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedOccurrence && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedOccurrence.title}</DialogTitle>
                <DialogDescription>
                  {selectedOccurrence.ministryName} - {selectedOccurrence.scheduleName}
                </DialogDescription>
              </DialogHeader>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{formatDate(selectedOccurrence.startTime)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(selectedOccurrence.startTime)} -{' '}
                      {formatTime(selectedOccurrence.endTime)}
                    </p>
                  </div>
                </div>

                {selectedOccurrence.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                    <p>{selectedOccurrence.location}</p>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {selectedOccurrence.registrationCount} Registered
                      {selectedOccurrence.capacity && ` / ${selectedOccurrence.capacity} capacity`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedOccurrence.attendanceCount} checked in
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-muted-foreground" />
                  <Badge variant={getStatusBadgeVariant(selectedOccurrence.status)} className="capitalize">
                    {selectedOccurrence.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedOccurrence(null)}>
                  Close
                </Button>
                <Button asChild>
                  <Link href={`/admin/community/planning/scheduler/occurrences/${selectedOccurrence.id}`}>
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
