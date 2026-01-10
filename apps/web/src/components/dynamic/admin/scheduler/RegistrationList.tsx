'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Search,
  Download,
  RefreshCw,
  Mail,
  Phone,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertCircle,
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
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface Registration {
  id: string;
  memberId?: string | null;
  memberName?: string | null;
  memberAvatar?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  partySize: number;
  status: string;
  waitlistPosition?: number | null;
  formResponses?: Record<string, unknown> | null;
  specialRequests?: string | null;
  registeredAt: string;
  checkedIn: boolean;
  checkedInAt?: string | null;
}

interface RegistrationCounts {
  confirmed: number;
  waitlisted: number;
  cancelled: number;
  total: number;
}

export interface RegistrationListProps {
  occurrenceId: string;
  capacity?: number | null;
  className?: string;
}

const getStatusBadgeVariant = (
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'confirmed':
      return 'default';
    case 'waitlisted':
      return 'secondary';
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'confirmed':
      return <CheckCircle2 className="w-3 h-3" />;
    case 'waitlisted':
      return <Clock className="w-3 h-3" />;
    case 'cancelled':
      return <XCircle className="w-3 h-3" />;
    default:
      return <AlertCircle className="w-3 h-3" />;
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

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export function RegistrationList({
  occurrenceId,
  capacity,
  className,
}: RegistrationListProps) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [counts, setCounts] = useState<RegistrationCounts>({
    confirmed: 0,
    waitlisted: 0,
    cancelled: 0,
    total: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const { toast } = useToast();

  const fetchRegistrations = useCallback(async () => {
    try {
      setIsLoading(true);
      let url = `/api/community/scheduler/occurrences/${occurrenceId}/registrations`;
      if (statusFilter !== 'all') {
        url += `?status=${statusFilter}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch registrations');
      }

      const result = await response.json();
      setRegistrations(result.data || []);
      setCounts(result.counts || { confirmed: 0, waitlisted: 0, cancelled: 0, total: 0 });
    } catch (error) {
      console.error('Error fetching registrations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load registrations.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [occurrenceId, statusFilter, toast]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleUpdateStatus = async (registrationId: string, status: string) => {
    try {
      const response = await fetch(
        `/api/community/scheduler/occurrences/${occurrenceId}/registrations/${registrationId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update registration');
      }

      toast({
        title: 'Success',
        description: 'Registration updated successfully.',
      });

      fetchRegistrations();
    } catch (error) {
      console.error('Error updating registration:', error);
      toast({
        title: 'Error',
        description: 'Failed to update registration.',
        variant: 'destructive',
      });
    }
  };

  const handleExport = () => {
    // Convert registrations to CSV
    const headers = ['Name', 'Email', 'Phone', 'Party Size', 'Status', 'Registered At', 'Checked In'];
    const rows = registrations.map((r) => [
      r.memberName || r.guestName || '',
      r.guestEmail || '',
      r.guestPhone || '',
      r.partySize.toString(),
      r.status,
      formatDate(r.registeredAt),
      r.checkedIn ? 'Yes' : 'No',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations-${occurrenceId}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'Registrations exported to CSV.',
    });
  };

  const filteredRegistrations = registrations.filter((reg) => {
    const name = reg.memberName || reg.guestName || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Registrations
              </CardTitle>
              <CardDescription>
                {capacity
                  ? `${counts.confirmed} / ${capacity} capacity`
                  : `${counts.confirmed} confirmed`}
                {counts.waitlisted > 0 && ` • ${counts.waitlisted} waitlisted`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchRegistrations} disabled={isLoading}>
                <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Summary */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="default">{counts.confirmed}</Badge>
              <span className="text-sm text-muted-foreground">Confirmed</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{counts.waitlisted}</Badge>
              <span className="text-sm text-muted-foreground">Waitlisted</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">{counts.cancelled}</Badge>
              <span className="text-sm text-muted-foreground">Cancelled</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search registrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="waitlisted">Waitlisted</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Registration List */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No registrations found</p>
              <p className="text-sm">Registrations will appear here when people sign up</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredRegistrations.map((registration) => (
                <div
                  key={registration.id}
                  className="flex items-center gap-4 py-3 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={registration.memberAvatar || undefined}
                      alt={registration.memberName || registration.guestName || 'Guest'}
                    />
                    <AvatarFallback>
                      {getInitials(registration.memberName || registration.guestName || 'G')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {registration.memberName || registration.guestName}
                      </p>
                      {!registration.memberId && (
                        <Badge variant="outline" className="text-xs">
                          Guest
                        </Badge>
                      )}
                      {registration.checkedIn && (
                        <Badge variant="default" className="text-xs bg-green-600">
                          <UserCheck className="w-3 h-3 mr-1" />
                          Checked In
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {registration.partySize > 1 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Party of {registration.partySize}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(registration.registeredAt)}
                      </span>
                    </div>
                  </div>

                  <Badge variant={getStatusBadgeVariant(registration.status)} className="capitalize">
                    {getStatusIcon(registration.status)}
                    <span className="ml-1">
                      {registration.status}
                      {registration.waitlistPosition && ` #${registration.waitlistPosition}`}
                    </span>
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedRegistration(registration)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleUpdateStatus(registration.id, 'confirmed')}
                        disabled={registration.status === 'confirmed'}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Confirm
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleUpdateStatus(registration.id, 'waitlisted')}
                        disabled={registration.status === 'waitlisted'}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Move to Waitlist
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleUpdateStatus(registration.id, 'cancelled')}
                        disabled={registration.status === 'cancelled'}
                        className="text-destructive"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registration Detail Dialog */}
      <Dialog
        open={!!selectedRegistration}
        onOpenChange={() => setSelectedRegistration(null)}
      >
        <DialogContent>
          {selectedRegistration && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedRegistration.memberName || selectedRegistration.guestName}
                </DialogTitle>
                <DialogDescription>Registration Details</DialogDescription>
              </DialogHeader>

              <Separator />

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge
                      variant={getStatusBadgeVariant(selectedRegistration.status)}
                      className="capitalize mt-1"
                    >
                      {selectedRegistration.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Party Size</p>
                    <p className="font-medium">{selectedRegistration.partySize}</p>
                  </div>
                </div>

                {selectedRegistration.guestEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedRegistration.guestEmail}</span>
                  </div>
                )}

                {selectedRegistration.guestPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedRegistration.guestPhone}</span>
                  </div>
                )}

                {selectedRegistration.specialRequests && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Special Requests</p>
                    <p className="text-sm">{selectedRegistration.specialRequests}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Registered</p>
                  <p className="text-sm">{formatDate(selectedRegistration.registeredAt)}</p>
                </div>

                {selectedRegistration.checkedIn && selectedRegistration.checkedInAt && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <UserCheck className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-400">Checked In</p>
                      <p className="text-sm text-green-600">
                        {formatDate(selectedRegistration.checkedInAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setSelectedRegistration(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
