'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  MoreVertical,
  Mail,
  Phone,
  Shield,
  Search,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

interface TeamMember {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail?: string | null;
  memberPhone?: string | null;
  memberAvatar?: string | null;
  role: string;
  status: string;
  joinedAt: string;
}

interface AvailableMember {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface MinistryTeamManagerProps {
  ministryId: string;
  ministryName?: string;
  className?: string;
  availableMembers?: AvailableMember[];
}

const TEAM_ROLES = [
  { value: 'leader', label: 'Leader' },
  { value: 'co_leader', label: 'Co-Leader' },
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'member', label: 'Member' },
  { value: 'volunteer', label: 'Volunteer' },
];

const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'outline' => {
  switch (role) {
    case 'leader':
      return 'default';
    case 'co_leader':
      return 'secondary';
    default:
      return 'outline';
  }
};

const getInitials = (name: string | undefined | null): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
};

export function MinistryTeamManager({
  ministryId,
  ministryName = 'Ministry',
  className,
  availableMembers: propAvailableMembers = [],
}: MinistryTeamManagerProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availableMembers, setAvailableMembers] = useState<AvailableMember[]>(propAvailableMembers);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('member');
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchTeamMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/community/ministries/${ministryId}/team`);

      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }

      const result = await response.json();
      setTeamMembers(result.data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team members.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [ministryId, toast]);

  // Sync prop-provided available members to state
  useEffect(() => {
    if (propAvailableMembers && propAvailableMembers.length > 0) {
      setAvailableMembers(propAvailableMembers);
    }
  }, [propAvailableMembers]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  const handleAddMember = async () => {
    if (!selectedMemberId) {
      toast({
        title: 'Error',
        description: 'Please select a member to add.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`/api/community/ministries/${ministryId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: selectedMemberId,
          role: selectedRole,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add team member');
      }

      toast({
        title: 'Success',
        description: 'Team member added successfully.',
      });

      setIsAddDialogOpen(false);
      setSelectedMemberId('');
      setSelectedRole('member');
      fetchTeamMembers();
    } catch (error) {
      console.error('Error adding team member:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add team member.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/community/ministries/${ministryId}/team/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      toast({
        title: 'Success',
        description: 'Role updated successfully.',
      });

      fetchTeamMembers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update role.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;

    try {
      setIsSaving(true);
      const response = await fetch(
        `/api/community/ministries/${ministryId}/team/${memberToDelete.memberId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to remove team member');
      }

      toast({
        title: 'Success',
        description: 'Team member removed successfully.',
      });

      setIsDeleteDialogOpen(false);
      setMemberToDelete(null);
      fetchTeamMembers();
    } catch (error) {
      console.error('Error removing team member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove team member.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredMembers = teamMembers.filter((member) =>
    (member.memberName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const existingMemberIds = new Set(teamMembers.map((m) => m.memberId));
  const filteredAvailableMembers = availableMembers.filter(
    (m) => !existingMemberIds.has(m.id)
  );

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                Manage team members for {ministryName}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchTeamMembers} disabled={isLoading}>
                <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Team List */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No team members found</p>
              <p className="text-sm">Add members to build your ministry team</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-4 py-3 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.memberAvatar || undefined} alt={member.memberName} />
                    <AvatarFallback>{getInitials(member.memberName)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.memberName}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {member.memberEmail && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3" />
                          {member.memberEmail}
                        </span>
                      )}
                      {member.memberPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {member.memberPhone}
                        </span>
                      )}
                    </div>
                  </div>

                  <Badge variant={getRoleBadgeVariant(member.role)} className="capitalize">
                    <Shield className="w-3 h-3 mr-1" />
                    {member.role.replace('_', '-')}
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {TEAM_ROLES.map((role) => (
                        <DropdownMenuItem
                          key={role.value}
                          onClick={() => handleUpdateRole(member.memberId, role.value)}
                          disabled={role.value === member.role}
                        >
                          Set as {role.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setMemberToDelete(member);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Select a member to add to the {ministryName} team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Member</Label>
              <Combobox
                options={filteredAvailableMembers.map((member) => ({
                  value: member.id,
                  label: member.name,
                  description: member.email || undefined,
                }))}
                value={selectedMemberId}
                onChange={setSelectedMemberId}
                placeholder="Select a member"
                searchPlaceholder="Search members..."
                emptyMessage="No members found."
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={isSaving || !selectedMemberId}>
              {isSaving ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToDelete?.memberName} from the team? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
