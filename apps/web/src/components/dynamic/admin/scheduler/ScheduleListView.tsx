'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  RefreshCw,
  MoreHorizontal,
  Edit,
  Trash2,
  Play,
  Pause,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  Video,
  Calendar,
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

interface ScheduleView {
  id: string;
  ministryId: string;
  ministryName: string;
  ministryColor: string;
  name: string;
  description?: string | null;
  scheduleType: string;
  scheduleTypeLabel: string;
  startTime: string;
  endTime?: string | null;
  timezone: string;
  recurrenceRule?: string | null;
  recurrenceDescription?: string | null;
  location?: string | null;
  locationType: string;
  virtualMeetingUrl?: string | null;
  capacity?: number | null;
  registrationRequired: boolean;
  isActive: boolean;
  upcomingOccurrenceCount: number;
}

interface Ministry {
  id: string;
  name: string;
  code: string;
  color: string;
}

export interface ScheduleListViewProps {
  className?: string;
}

const scheduleTypeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'service', label: 'Worship Service' },
  { value: 'bible_study', label: 'Bible Study' },
  { value: 'rehearsal', label: 'Rehearsal' },
  { value: 'conference', label: 'Conference' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'other', label: 'Other' },
];

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

function getLocationIcon(locationType: string) {
  switch (locationType) {
    case 'virtual':
      return Video;
    case 'hybrid':
      return Users;
    default:
      return MapPin;
  }
}

function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
  onToggleActive,
  onGenerateOccurrences,
}: {
  schedule: ScheduleView;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onGenerateOccurrences: () => void;
}) {
  const LocationIcon = getLocationIcon(schedule.locationType);

  return (
    <Card className="group hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: schedule.ministryColor + '20' }}
            >
              <CalendarDays
                className="w-5 h-5"
                style={{ color: schedule.ministryColor }}
              />
            </div>
            <div>
              <CardTitle className="text-base">{schedule.name}</CardTitle>
              <CardDescription className="text-xs">
                {schedule.ministryName}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={schedule.isActive ? 'default' : 'secondary'}>
              {schedule.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Schedule
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onGenerateOccurrences}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Generate Occurrences
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onToggleActive}>
                  {schedule.isActive ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Schedule
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {schedule.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {schedule.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            {schedule.scheduleTypeLabel}
          </Badge>
          {schedule.registrationRequired && (
            <Badge variant="outline" className="text-xs">
              Registration Required
            </Badge>
          )}
          {schedule.capacity && (
            <Badge variant="outline" className="text-xs">
              Capacity: {schedule.capacity}
            </Badge>
          )}
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              {formatTime(schedule.startTime)}
              {schedule.endTime && ` - ${formatTime(schedule.endTime)}`}
            </span>
          </div>

          {schedule.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <LocationIcon className="w-4 h-4" />
              <span className="truncate">{schedule.location}</span>
            </div>
          )}
        </div>

        {schedule.recurrenceDescription && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
            {schedule.recurrenceDescription}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            {schedule.upcomingOccurrenceCount} upcoming events
          </span>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/admin/community/planning/scheduler/schedules/${schedule.id}`}>
              View Details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ScheduleListView({ className }: ScheduleListViewProps) {
  const [schedules, setSchedules] = useState<ScheduleView[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ministryFilter, setMinistryFilter] = useState('all');
  const [deleteSchedule, setDeleteSchedule] = useState<ScheduleView | null>(null);
  const { toast } = useToast();

  const fetchSchedules = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/community/scheduler/schedules');

      if (!response.ok) {
        throw new Error('Failed to fetch schedules');
      }

      const result = await response.json();
      setSchedules(result.data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load schedules. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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
    fetchSchedules();
    fetchMinistries();
  }, [fetchSchedules, fetchMinistries]);

  const handleToggleActive = async (schedule: ScheduleView) => {
    try {
      const response = await fetch(`/api/community/scheduler/schedules/${schedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !schedule.isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update schedule');
      }

      toast({
        title: 'Success',
        description: `Schedule ${schedule.isActive ? 'deactivated' : 'activated'} successfully`,
      });

      fetchSchedules();
    } catch (error) {
      console.error('Error toggling schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update schedule status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteSchedule) return;

    try {
      const response = await fetch(`/api/community/scheduler/schedules/${deleteSchedule.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }

      toast({
        title: 'Success',
        description: 'Schedule deleted successfully',
      });

      setDeleteSchedule(null);
      fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete schedule',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateOccurrences = async (schedule: ScheduleView) => {
    try {
      const response = await fetch(
        `/api/community/scheduler/schedules/${schedule.id}/generate-occurrences`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error('Failed to generate occurrences');
      }

      const result = await response.json();

      toast({
        title: 'Success',
        description: `Generated ${result.data?.created || 0} new occurrences`,
      });

      fetchSchedules();
    } catch (error) {
      console.error('Error generating occurrences:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate occurrences',
        variant: 'destructive',
      });
    }
  };

  // Filter schedules
  const filteredSchedules = schedules.filter((schedule) => {
    // Search filter
    if (
      searchQuery &&
      !schedule.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !schedule.ministryName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    // Type filter
    if (typeFilter !== 'all' && schedule.scheduleType !== typeFilter) {
      return false;
    }

    // Status filter
    if (statusFilter === 'active' && !schedule.isActive) {
      return false;
    }
    if (statusFilter === 'inactive' && schedule.isActive) {
      return false;
    }

    // Ministry filter
    if (ministryFilter !== 'all' && schedule.ministryId !== ministryFilter) {
      return false;
    }

    return true;
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
            <h1 className="text-2xl font-bold tracking-tight">Schedules</h1>
            <p className="text-muted-foreground">
              Manage recurring ministry schedules and events
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchSchedules} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/admin/community/planning/scheduler/schedules/manage">
              <Plus className="h-4 w-4 mr-2" />
              Create Schedule
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
                placeholder="Search schedules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

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

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {scheduleTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
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

      {/* Schedule Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
                <div className="h-4 w-32 bg-muted animate-pulse rounded mt-2" />
                <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-muted animate-pulse rounded" />
                  <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSchedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No Schedules Found</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              {searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || ministryFilter !== 'all'
                ? 'No schedules match your current filters. Try adjusting your search criteria.'
                : 'Get started by creating your first schedule for a ministry.'}
            </p>
            {!searchQuery && typeFilter === 'all' && statusFilter === 'all' && ministryFilter === 'all' && (
              <Button asChild className="mt-4">
                <Link href="/admin/community/planning/scheduler/schedules/manage">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Schedule
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSchedules.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              onEdit={() => {
                window.location.href = `/admin/community/planning/scheduler/schedules/${schedule.id}`;
              }}
              onDelete={() => setDeleteSchedule(schedule)}
              onToggleActive={() => handleToggleActive(schedule)}
              onGenerateOccurrences={() => handleGenerateOccurrences(schedule)}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {!isLoading && filteredSchedules.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredSchedules.length} of {schedules.length} schedules
        </p>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSchedule} onOpenChange={() => setDeleteSchedule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteSchedule?.name}&quot;? This will also
              delete all associated occurrences, registrations, and attendance records. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
