'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  Search,
  RefreshCw,
  Download,
  Clock,
  MoreVertical,
  QrCode,
  Keyboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface AttendanceRecord {
  id: string;
  memberId?: string | null;
  memberName?: string | null;
  memberAvatar?: string | null;
  guestName?: string | null;
  checkinMethod: string;
  checkedInAt: string;
  checkedInBy?: string | null;
  checkedInByName?: string | null;
}

interface AttendanceStats {
  totalCheckedIn: number;
  members: number;
  guests: number;
  byMethod: {
    manual: number;
    staff_scan: number;
    self_checkin: number;
  };
}

interface AvailableMember {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface AttendanceTrackerProps {
  occurrenceId: string;
  className?: string;
}

const getMethodBadgeVariant = (method: string): 'default' | 'secondary' | 'outline' => {
  switch (method) {
    case 'manual':
      return 'outline';
    case 'staff_scan':
      return 'secondary';
    case 'self_checkin':
      return 'default';
    default:
      return 'outline';
  }
};

const getMethodIcon = (method: string) => {
  switch (method) {
    case 'staff_scan':
      return <QrCode className="w-3 h-3" />;
    case 'self_checkin':
      return <UserCheck className="w-3 h-3" />;
    default:
      return <Keyboard className="w-3 h-3" />;
  }
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export function AttendanceTracker({
  occurrenceId,
  className,
}: AttendanceTrackerProps) {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [availableMembers, setAvailableMembers] = useState<AvailableMember[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchAttendance = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch attendance records
      const response = await fetch(
        `/api/community/scheduler/occurrences/${occurrenceId}/attendance`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch attendance');
      }

      const result = await response.json();
      setAttendances(result.data || []);

      // Fetch stats
      const statsResponse = await fetch(
        `/api/community/scheduler/occurrences/${occurrenceId}/attendance?include_stats=true`
      );

      if (statsResponse.ok) {
        const statsResult = await statsResponse.json();
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to load attendance records.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [occurrenceId, toast]);

  const fetchAvailableMembers = useCallback(async () => {
    try {
      const response = await fetch('/api/user-member-link/search?type=members&linked=all&q=');

      if (response.ok) {
        const result = await response.json();
        const members = (result.results || []).map((m: { id: string; first_name: string; last_name: string }) => ({
          id: m.id,
          name: `${m.first_name} ${m.last_name}`,
          avatarUrl: undefined,
        }));
        setAvailableMembers(members);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    fetchAvailableMembers();
  }, [fetchAvailableMembers]);

  const handleManualCheckIn = async () => {
    if (isAddingMember && !selectedMemberId) {
      toast({
        title: 'Error',
        description: 'Please select a member.',
        variant: 'destructive',
      });
      return;
    }

    if (!isAddingMember && !guestName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a guest name.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);

      const body = isAddingMember
        ? { member_id: selectedMemberId, checkin_method: 'manual' }
        : { guest_name: guestName.trim(), checkin_method: 'manual' };

      const response = await fetch(
        `/api/community/scheduler/occurrences/${occurrenceId}/attendance`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to check in');
      }

      toast({
        title: 'Success',
        description: isAddingMember ? 'Member checked in.' : 'Guest checked in.',
      });

      setIsAddDialogOpen(false);
      setSelectedMemberId('');
      setGuestName('');
      fetchAttendance();
    } catch (error) {
      console.error('Error checking in:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to check in.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const headers = ['Name', 'Type', 'Method', 'Time', 'Checked In By'];
    const rows = attendances.map((a) => [
      a.memberName || a.guestName || '',
      a.memberId ? 'Member' : 'Guest',
      a.checkinMethod,
      formatTime(a.checkedInAt),
      a.checkedInByName || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${occurrenceId}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'Attendance exported to CSV.',
    });
  };

  const filteredAttendances = attendances.filter((att) => {
    const name = att.memberName || att.guestName || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMethod = methodFilter === 'all' || att.checkinMethod === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const checkedInMemberIds = new Set(attendances.filter((a) => a.memberId).map((a) => a.memberId));
  const availableMembersNotCheckedIn = availableMembers.filter(
    (m) => !checkedInMemberIds.has(m.id)
  );

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Attendance
              </CardTitle>
              <CardDescription>
                {stats
                  ? `${stats.totalCheckedIn} checked in (${stats.members} members, ${stats.guests} guests)`
                  : 'Track event attendance'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchAttendance} disabled={isLoading}>
                <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Manual Check-in
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Summary */}
          {stats && (
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="default">{stats.totalCheckedIn}</Badge>
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{stats.byMethod.manual}</Badge>
                <span className="text-sm text-muted-foreground">Manual</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{stats.byMethod.staff_scan}</Badge>
                <span className="text-sm text-muted-foreground">Staff Scan</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">{stats.byMethod.self_checkin}</Badge>
                <span className="text-sm text-muted-foreground">Self Check-in</span>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search attendees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="staff_scan">Staff Scan</SelectItem>
                <SelectItem value="self_checkin">Self Check-in</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Attendance List */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filteredAttendances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No attendance records</p>
              <p className="text-sm">Check-ins will appear here</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredAttendances.map((attendance) => (
                <div
                  key={attendance.id}
                  className="flex items-center gap-4 py-3 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={attendance.memberAvatar || undefined}
                      alt={attendance.memberName || attendance.guestName || 'Attendee'}
                    />
                    <AvatarFallback>
                      {getInitials(attendance.memberName || attendance.guestName || 'A')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {attendance.memberName || attendance.guestName}
                      </p>
                      {!attendance.memberId && (
                        <Badge variant="outline" className="text-xs">
                          Guest
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {formatTime(attendance.checkedInAt)}
                      {attendance.checkedInByName && (
                        <span className="text-xs">by {attendance.checkedInByName}</span>
                      )}
                    </p>
                  </div>

                  <Badge
                    variant={getMethodBadgeVariant(attendance.checkinMethod)}
                    className="capitalize"
                  >
                    {getMethodIcon(attendance.checkinMethod)}
                    <span className="ml-1">{attendance.checkinMethod.replace('_', ' ')}</span>
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Check-in Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Check-in</DialogTitle>
            <DialogDescription>
              Check in a member or add a guest to the attendance list.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={isAddingMember ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsAddingMember(true)}
              >
                Member
              </Button>
              <Button
                variant={!isAddingMember ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsAddingMember(false)}
              >
                Guest
              </Button>
            </div>

            {isAddingMember ? (
              <div className="space-y-2">
                <Label>Select Member</Label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembersNotCheckedIn.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableMembersNotCheckedIn.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    All members have already checked in.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Guest Name</Label>
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter guest name..."
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleManualCheckIn} disabled={isSaving}>
              {isSaving ? 'Checking in...' : 'Check In'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
