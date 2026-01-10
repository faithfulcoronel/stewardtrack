'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Search,
  Filter,
  RefreshCw,
  MoreHorizontal,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  UserCheck,
  QrCode,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface OccurrenceView {
  id: string;
  scheduleId: string;
  scheduleName: string;
  ministryId: string;
  ministryName: string;
  ministryColor: string;
  ministryIcon: string;
  title: string;
  description?: string | null;
  occurrenceDate: string;
  startAt: string;
  endAt?: string | null;
  location?: string | null;
  locationType: string;
  virtualMeetingUrl?: string | null;
  capacity?: number | null;
  status: string;
  statusLabel: string;
  cancellationReason?: string | null;
  registeredCount: number;
  waitlistCount: number;
  checkedInCount: number;
  availableSpots?: number | null;
  registrationRequired: boolean;
  hasQrCode: boolean;
}

interface Ministry {
  id: string;
  name: string;
  code: string;
  color: string;
}

export interface OccurrenceListViewProps {
  className?: string;
}

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const dateRangeOptions = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'past', label: 'Past Events' },
  { value: 'all', label: 'All Time' },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'in_progress':
      return Play;
    case 'completed':
      return CheckCircle2;
    case 'cancelled':
      return XCircle;
    default:
      return Calendar;
  }
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
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
}

export function OccurrenceListView({ className }: OccurrenceListViewProps) {
  const [occurrences, setOccurrences] = useState<OccurrenceView[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('upcoming');
  const [ministryFilter, setMinistryFilter] = useState('all');
  const [cancelOccurrence, setCancelOccurrence] = useState<OccurrenceView | null>(null);
  const { toast } = useToast();

  const fetchOccurrences = useCallback(async () => {
    try {
      setIsLoading(true);

      // Build query params
      const params = new URLSearchParams();

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      // Date range filtering
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      switch (dateRangeFilter) {
        case 'today':
          params.set('start_date', today);
          params.set('end_date', today);
          break;
        case 'this_week': {
          const weekEnd = new Date(now);
          weekEnd.setDate(weekEnd.getDate() + 7);
          params.set('start_date', today);
          params.set('end_date', weekEnd.toISOString().split('T')[0]);
          break;
        }
        case 'this_month': {
          const monthEnd = new Date(now);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          params.set('start_date', today);
          params.set('end_date', monthEnd.toISOString().split('T')[0]);
          break;
        }
        case 'upcoming':
          params.set('start_date', today);
          break;
        case 'past': {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          params.set('end_date', yesterday.toISOString().split('T')[0]);
          break;
        }
        // 'all' - no date filter
      }

      if (ministryFilter !== 'all') {
        params.set('ministry_id', ministryFilter);
      }

      const response = await fetch(`/api/community/scheduler/occurrences?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch occurrences');
      }

      const result = await response.json();
      setOccurrences(result.data || []);
    } catch (error) {
      console.error('Error fetching occurrences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load occurrences. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, dateRangeFilter, ministryFilter, toast]);

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

  useEffect(() => {
    fetchOccurrences();
    fetchMinistries();
  }, [fetchOccurrences, fetchMinistries]);

  const handleCancelOccurrence = async () => {
    if (!cancelOccurrence) return;

    try {
      const response = await fetch(
        `/api/community/scheduler/occurrences/${cancelOccurrence.id}/cancel`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Cancelled by administrator' }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to cancel occurrence');
      }

      toast({
        title: 'Success',
        description: 'Event occurrence cancelled successfully',
      });

      setCancelOccurrence(null);
      fetchOccurrences();
    } catch (error) {
      console.error('Error cancelling occurrence:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel occurrence',
        variant: 'destructive',
      });
    }
  };

  const handleStartOccurrence = async (occurrence: OccurrenceView) => {
    try {
      const response = await fetch(
        `/api/community/scheduler/occurrences/${occurrence.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'in_progress' }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to start occurrence');
      }

      toast({
        title: 'Success',
        description: 'Event started successfully',
      });

      fetchOccurrences();
    } catch (error) {
      console.error('Error starting occurrence:', error);
      toast({
        title: 'Error',
        description: 'Failed to start event',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteOccurrence = async (occurrence: OccurrenceView) => {
    try {
      const response = await fetch(
        `/api/community/scheduler/occurrences/${occurrence.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to complete occurrence');
      }

      toast({
        title: 'Success',
        description: 'Event completed successfully',
      });

      fetchOccurrences();
    } catch (error) {
      console.error('Error completing occurrence:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete event',
        variant: 'destructive',
      });
    }
  };

  // Filter occurrences by search
  const filteredOccurrences = occurrences.filter((occurrence) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      occurrence.title.toLowerCase().includes(query) ||
      occurrence.scheduleName.toLowerCase().includes(query) ||
      occurrence.ministryName.toLowerCase().includes(query)
    );
  });

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/community/planning/scheduler">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Occurrences</h1>
            <p className="text-muted-foreground">
              View and manage scheduled event occurrences
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchOccurrences} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/community/planning/scheduler/checkin">
              <QrCode className="h-4 w-4 mr-2" />
              Check-In Station
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search occurrences..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
              <SelectTrigger className="w-[160px]">
                <CalendarDays className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={ministryFilter} onValueChange={setMinistryFilter}>
              <SelectTrigger className="w-[180px]">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Ministry" />
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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Occurrences Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filteredOccurrences.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-1">No Occurrences Found</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                {searchQuery || statusFilter !== 'all' || ministryFilter !== 'all'
                  ? 'No occurrences match your current filters.'
                  : 'No scheduled occurrences. Generate occurrences from a schedule.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-center">Registrations</TableHead>
                  <TableHead className="text-center">Checked In</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOccurrences.map((occurrence) => {
                  const StatusIcon = getStatusIcon(occurrence.status);

                  return (
                    <TableRow key={occurrence.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: occurrence.ministryColor + '20' }}
                          >
                            <Calendar
                              className="w-4 h-4"
                              style={{ color: occurrence.ministryColor }}
                            />
                          </div>
                          <div>
                            <Link
                              href={`/admin/community/planning/scheduler/occurrences/${occurrence.id}`}
                              className="font-medium hover:underline"
                            >
                              {occurrence.title}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {occurrence.ministryName} - {occurrence.scheduleName}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm">{formatDate(occurrence.occurrenceDate)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(occurrence.startAt)}
                              {occurrence.endAt && ` - ${formatTime(occurrence.endAt)}`}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {occurrence.location ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm truncate max-w-[150px]">
                              {occurrence.location}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <ClipboardList className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {occurrence.registeredCount}
                            {occurrence.capacity && `/${occurrence.capacity}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                          <span>{occurrence.checkedInCount}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(occurrence.status)} className="capitalize">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {occurrence.statusLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/community/planning/scheduler/occurrences/${occurrence.id}`}>
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            {occurrence.status === 'scheduled' && (
                              <DropdownMenuItem onClick={() => handleStartOccurrence(occurrence)}>
                                <Play className="mr-2 h-4 w-4" />
                                Start Event
                              </DropdownMenuItem>
                            )}
                            {occurrence.status === 'in_progress' && (
                              <DropdownMenuItem onClick={() => handleCompleteOccurrence(occurrence)}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Complete Event
                              </DropdownMenuItem>
                            )}
                            {occurrence.status === 'scheduled' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setCancelOccurrence(occurrence)}
                                  className="text-destructive"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancel Event
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Results count */}
      {!isLoading && filteredOccurrences.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredOccurrences.length} occurrences
        </p>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelOccurrence} onOpenChange={() => setCancelOccurrence(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel &quot;{cancelOccurrence?.title}&quot; scheduled for{' '}
              {cancelOccurrence && formatDate(cancelOccurrence.occurrenceDate)}? This will notify
              all registered attendees.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Event</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOccurrence}
              className="bg-destructive text-destructive-foreground"
            >
              Cancel Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
