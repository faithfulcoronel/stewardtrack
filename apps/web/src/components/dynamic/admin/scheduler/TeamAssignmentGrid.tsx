'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Check,
  X,
  Clock,
  CalendarDays,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TeamMember {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatar?: string | null;
  role: string;
}

interface TeamAssignment {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatar?: string | null;
  role: string;
  assignedRole?: string | null;
  status: string;
  notes?: string | null;
}

interface Occurrence {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
}

export interface TeamAssignmentGridProps {
  occurrenceId: string;
  ministryId: string;
  className?: string;
}

const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'confirmed':
      return 'default';
    case 'tentative':
      return 'secondary';
    case 'declined':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'confirmed':
      return <Check className="w-3 h-3" />;
    case 'declined':
      return <X className="w-3 h-3" />;
    case 'tentative':
      return <Clock className="w-3 h-3" />;
    default:
      return null;
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

const formatDateTime = (date: Date): string => {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export function TeamAssignmentGrid({
  occurrenceId,
  ministryId,
  className,
}: TeamAssignmentGridProps) {
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [occurrence, setOccurrence] = useState<Occurrence | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch occurrence details
      const occResponse = await fetch(`/api/community/scheduler/occurrences/${occurrenceId}`);
      if (occResponse.ok) {
        const occResult = await occResponse.json();
        if (occResult.data) {
          setOccurrence({
            ...occResult.data,
            startTime: new Date(occResult.data.startTime),
            endTime: new Date(occResult.data.endTime),
          });
        }
      }

      // Fetch team assignments for this occurrence
      const assignResponse = await fetch(
        `/api/community/scheduler/occurrences/${occurrenceId}/team-assignments`
      );
      if (assignResponse.ok) {
        const assignResult = await assignResponse.json();
        setAssignments(assignResult.data || []);
      }

      // Fetch ministry team members
      const teamResponse = await fetch(`/api/community/ministries/${ministryId}/team`);
      if (teamResponse.ok) {
        const teamResult = await teamResponse.json();
        setTeamMembers(teamResult.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team assignments.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [occurrenceId, ministryId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenAssignDialog = () => {
    const assignedIds = new Set(assignments.map((a) => a.memberId));
    setSelectedMembers(assignedIds);
    setIsAssignDialogOpen(true);
  };

  const handleToggleMember = (memberId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const handleSaveAssignments = async () => {
    try {
      setIsSaving(true);

      const currentIds = new Set(assignments.map((a) => a.memberId));
      const toAdd = [...selectedMembers].filter((id) => !currentIds.has(id));
      const toRemove = [...currentIds].filter((id) => !selectedMembers.has(id));

      // Add new assignments
      for (const memberId of toAdd) {
        await fetch(`/api/community/scheduler/occurrences/${occurrenceId}/team-assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ member_id: memberId }),
        });
      }

      // Remove unselected assignments
      for (const memberId of toRemove) {
        const assignment = assignments.find((a) => a.memberId === memberId);
        if (assignment) {
          await fetch(
            `/api/community/scheduler/occurrences/${occurrenceId}/team-assignments/${assignment.id}`,
            { method: 'DELETE' }
          );
        }
      }

      toast({
        title: 'Success',
        description: 'Team assignments updated successfully.',
      });

      setIsAssignDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast({
        title: 'Error',
        description: 'Failed to update team assignments.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (assignmentId: string, status: string) => {
    try {
      const response = await fetch(
        `/api/community/scheduler/occurrences/${occurrenceId}/team-assignments/${assignmentId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      toast({
        title: 'Success',
        description: 'Status updated successfully.',
      });

      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status.',
        variant: 'destructive',
      });
    }
  };

  const confirmedCount = assignments.filter((a) => a.status === 'confirmed').length;
  const pendingCount = assignments.filter((a) => a.status === 'pending').length;

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Assignments
              </CardTitle>
              <CardDescription>
                {occurrence ? (
                  <span className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    {formatDateTime(occurrence.startTime)}
                  </span>
                ) : (
                  'Manage team assignments for this event'
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
                <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
                Refresh
              </Button>
              <Button size="sm" onClick={handleOpenAssignDialog}>
                <UserPlus className="w-4 h-4 mr-2" />
                Manage Team
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          <div className="flex items-center gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="default">{confirmedCount}</Badge>
              <span className="text-muted-foreground">Confirmed</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{pendingCount}</Badge>
              <span className="text-muted-foreground">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{assignments.length}</Badge>
              <span className="text-muted-foreground">Total</span>
            </div>
          </div>

          {/* Assignments List */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No team assignments</p>
              <p className="text-sm">Click &quot;Manage Team&quot; to assign members</p>
            </div>
          ) : (
            <div className="divide-y">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center gap-4 py-3 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={assignment.memberAvatar || undefined}
                      alt={assignment.memberName}
                    />
                    <AvatarFallback>{getInitials(assignment.memberName)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{assignment.memberName}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {assignment.assignedRole || assignment.role}
                    </p>
                  </div>

                  <Badge variant={getStatusBadgeVariant(assignment.status)} className="capitalize">
                    {getStatusIcon(assignment.status)}
                    <span className="ml-1">{assignment.status}</span>
                  </Badge>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-8 w-8',
                        assignment.status === 'confirmed' && 'text-green-600'
                      )}
                      onClick={() => handleUpdateStatus(assignment.id, 'confirmed')}
                      title="Confirm"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-8 w-8',
                        assignment.status === 'tentative' && 'text-yellow-600'
                      )}
                      onClick={() => handleUpdateStatus(assignment.id, 'tentative')}
                      title="Tentative"
                    >
                      <Clock className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-8 w-8',
                        assignment.status === 'declined' && 'text-red-600'
                      )}
                      onClick={() => handleUpdateStatus(assignment.id, 'declined')}
                      title="Declined"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Members Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Team Assignments</DialogTitle>
            <DialogDescription>
              Select team members to assign to this event.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer"
                  onClick={() => handleToggleMember(member.memberId)}
                >
                  <Checkbox
                    checked={selectedMembers.has(member.memberId)}
                    onCheckedChange={() => handleToggleMember(member.memberId)}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={member.memberAvatar || undefined}
                      alt={member.memberName}
                    />
                    <AvatarFallback>{getInitials(member.memberName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.memberName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                  </div>
                </div>
              ))}
              {teamMembers.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No team members available</p>
                  <p className="text-sm">Add members to the ministry team first</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAssignments} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Assignments'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
