'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Users,
  ChevronDown,
  Check,
  X,
  UserPlus,
  MoreHorizontal,
  Loader2,
  Shield,
  AlertCircle,
  Trash2,
  RefreshCw,
  Link2,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { encodeTeamInviteToken } from '@/lib/tokens/shortUrlTokens';

// ============================================================================
// Types
// ============================================================================

interface Role {
  id: string;
  name: string;
  description?: string;
  scope: 'system' | 'tenant' | 'campus' | 'ministry';
  is_system: boolean;
  is_delegatable: boolean;
  metadata_key?: string;
}

interface TeamMember {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  roles: Role[];
  created_at?: string;
}

interface RoleConflict {
  role1: Role;
  role2: Role;
  conflict_type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface TeamMembersSectionProps {
  title?: string;
  description?: string;
  tenantId?: string;
  tenantName?: string;
  logoUrl?: string;
  coverImageUrl?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getInitials(firstName?: string, lastName?: string, email?: string): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return '??';
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-cyan-500',
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
}

function getDisplayName(member: TeamMember): string {
  if (member.first_name && member.last_name) {
    return `${member.first_name} ${member.last_name}`;
  }
  if (member.first_name) {
    return member.first_name;
  }
  return member.email.split('@')[0];
}

function getRoleBadgeVariant(role: Role): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (role.is_system) return 'destructive';
  if (role.scope === 'tenant') return 'default';
  return 'secondary';
}

// ============================================================================
// Role Multi-Select Dropdown Component
// ============================================================================

interface RoleMultiSelectProps {
  member: TeamMember;
  availableRoles: Role[];
  onRolesChange: (memberId: string, roleIds: string[]) => Promise<void>;
  onRemoveAccess: (memberId: string) => void;
  isLoading?: boolean;
}

function RoleMultiSelect({
  member,
  availableRoles,
  onRolesChange,
  onRemoveAccess,
  isLoading
}: RoleMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [pendingRoles, setPendingRoles] = useState<string[]>(member.roles.map(r => r.id));
  const [isSaving, setIsSaving] = useState(false);

  // Reset pending roles when member changes
  useEffect(() => {
    setPendingRoles(member.roles.map(r => r.id));
  }, [member.roles]);

  const hasChanges = useMemo(() => {
    const currentIds = member.roles.map(r => r.id).sort();
    const pendingIds = [...pendingRoles].sort();
    return JSON.stringify(currentIds) !== JSON.stringify(pendingIds);
  }, [member.roles, pendingRoles]);

  const handleToggleRole = (roleId: string) => {
    setPendingRoles(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      await onRolesChange(member.id, pendingRoles);
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setPendingRoles(member.roles.map(r => r.id));
    setOpen(false);
  };

  const primaryRole = member.roles[0];
  const additionalCount = member.roles.length - 1;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={isLoading}>
        <Button
          variant="ghost"
          className="h-auto p-1 hover:bg-muted/50 text-left justify-start gap-1"
        >
          <span className="text-sm text-muted-foreground">
            {primaryRole ? primaryRole.name : 'No role'}
          </span>
          {additionalCount > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">
              +{additionalCount}
            </Badge>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">Assign Roles</p>
          <p className="text-xs text-muted-foreground">Select multiple roles for this member</p>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-48 overflow-y-auto">
          {availableRoles.map(role => (
            <DropdownMenuCheckboxItem
              key={role.id}
              checked={pendingRoles.includes(role.id)}
              onCheckedChange={() => handleToggleRole(role.id)}
              onSelect={(e) => e.preventDefault()}
            >
              <div className="flex flex-col">
                <span className="text-sm">{role.name}</span>
                {role.description && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {role.description}
                  </span>
                )}
              </div>
              {role.scope !== 'tenant' && (
                <Badge variant="outline" className="ml-auto text-xs">
                  {role.scope}
                </Badge>
              )}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
        {hasChanges && (
          <>
            <DropdownMenuSeparator />
            <div className="flex gap-2 p-2">
              <Button
                size="sm"
                variant="ghost"
                className="flex-1"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleSave}
                disabled={isSaving || pendingRoles.length === 0}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onRemoveAccess(member.id)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Remove access
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// Invite Dialog Component (Canva-style)
// ============================================================================

interface EmailInviteRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  error?: string;
}

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableRoles: Role[];
  members: TeamMember[];
  tenantId?: string;
  tenantName?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  onInvite: (data: { firstName: string; lastName: string; email: string; roleId: string; roleName: string }) => Promise<void>;
}

function InviteDialog({
  open,
  onOpenChange,
  availableRoles,
  members,
  tenantId,
  tenantName = 'Your Church',
  logoUrl,
  coverImageUrl,
  onInvite
}: InviteDialogProps) {
  // Default role (first non-system role or first role)
  const defaultRoleId = availableRoles.find(r => !r.is_system)?.id || availableRoles[0]?.id || '';

  // Find the member role ID for link invites
  const memberRoleId = availableRoles.find(r => r.name.toLowerCase() === 'member' || r.metadata_key === 'role_member')?.id || defaultRoleId;

  // Email invite rows
  const [emailRows, setEmailRows] = useState<EmailInviteRow[]>([
    { id: '1', firstName: '', lastName: '', email: '', roleId: defaultRoleId },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [isLinkActive, setIsLinkActive] = useState(true);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setEmailRows([
        { id: '1', firstName: '', lastName: '', email: '', roleId: defaultRoleId },
      ]);
      setInviteLinkCopied(false);
      setInviteLink(null);
      setIsLinkActive(true);
    }
  }, [open, defaultRoleId]);

  // Validate email
  const validateEmail = (email: string): string | undefined => {
    if (!email) return undefined;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return `"${email}" doesn't look like an email address. Try again?`;
    }
    return undefined;
  };

  // Update email row
  const updateEmailRow = (id: string, field: keyof EmailInviteRow, value: string) => {
    setEmailRows(prev => prev.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };
        if (field === 'email') {
          updated.error = validateEmail(value);
        }
        return updated;
      }
      return row;
    }));
  };

  // Add new email row
  const addEmailRow = () => {
    setEmailRows(prev => [
      ...prev,
      { id: Date.now().toString(), firstName: '', lastName: '', email: '', roleId: defaultRoleId }
    ]);
  };

  // Remove email row
  const removeEmailRow = (id: string) => {
    if (emailRows.length > 1) {
      setEmailRows(prev => prev.filter(row => row.id !== id));
    }
  };

  // Generate invite link with 30-day expiration
  const handleGenerateInviteLink = async () => {
    if (!tenantId) return;

    setIsGeneratingLink(true);
    try {
      // Generate the link with team invite token (includes 30-day expiration)
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const token = encodeTeamInviteToken(tenantId, 30); // 30 days expiration
      const generatedLink = `${baseUrl}/join?invite=${token}`;
      setInviteLink(generatedLink);
      toast.success('Invite link generated! Valid for 30 days.');
    } catch (error) {
      toast.error('Failed to generate invite link');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Copy invite link to clipboard
  const handleCopyInviteLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setInviteLinkCopied(true);
    toast.success('Invite link copied to clipboard');
    setTimeout(() => setInviteLinkCopied(false), 3000);
  };

  // Deactivate link (reset to show button again)
  const handleDeactivateLink = () => {
    setInviteLink(null);
    setIsLinkActive(true);
    toast.success('Invite link deactivated');
  };

  // Submit invitations
  const handleSubmit = async () => {
    const validRows = emailRows.filter(row => row.email && !row.error);

    if (validRows.length === 0) {
      toast.error('Please enter at least one valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      // Send invitations one by one
      for (const row of validRows) {
        const role = availableRoles.find(r => r.id === row.roleId);
        if (role) {
          await onInvite({
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            roleId: row.roleId,
            roleName: role.name,
          });
        }
      }
      onOpenChange(false);
    } catch (error) {
      // Error is handled in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get role name for display
  const getRoleName = (roleId: string) => {
    return availableRoles.find(r => r.id === roleId)?.name || 'Team member';
  };

  // Team member count
  const teamCount = members.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 overflow-hidden" style={{ maxWidth: '900px' }}>
        {/* Accessibility: Hidden title for screen readers */}
        <DialogTitle className="sr-only">Invite people to your team</DialogTitle>

        <div className="flex max-h-[90vh]">
          {/* Left Side - Form (70%) */}
          <div className="flex-[7] p-6 overflow-y-auto">
            {/* Header */}
            <div className="mb-5">
              <h2 className="text-xl font-bold text-foreground">Invite people to your team</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your team has <span className="text-primary font-medium">{teamCount} {teamCount === 1 ? 'person' : 'people'}</span>.
              </p>
            </div>

            {/* Existing Team Members (chips) */}
            {members.length > 0 && (
              <div className="mb-5">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Team members</label>
                <div className="flex flex-wrap gap-2">
                  {members.slice(0, 5).map(member => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 px-2.5 py-1 bg-muted rounded-full text-sm"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className={getAvatarColor(getDisplayName(member))}>
                          {getInitials(member.first_name, member.last_name, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-[100px]">{getDisplayName(member)}</span>
                    </div>
                  ))}
                  {members.length > 5 && (
                    <div className="flex items-center px-2.5 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                      +{members.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Invite via Link Section (Canva-style) */}
            {tenantId && (
              <div className="mb-5">
                {!inviteLink ? (
                  // Initial state: Show "Get invite link" button
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11"
                    onClick={handleGenerateInviteLink}
                    disabled={isGeneratingLink}
                  >
                    {isGeneratingLink ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating link...
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4 mr-2" />
                        Get invite link
                      </>
                    )}
                  </Button>
                ) : (
                  // After generating: Show the link with copy button
                  <>
                    <label className="text-sm font-medium mb-2 block">Invite people via link</label>
                    <div className="flex gap-2">
                      <Input
                        value={inviteLink}
                        readOnly
                        className="flex-1 text-sm font-mono"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <Button
                        type="button"
                        variant={inviteLinkCopied ? 'default' : 'outline'}
                        className="shrink-0 gap-1.5"
                        onClick={handleCopyInviteLink}
                      >
                        <Copy className="h-4 w-4" />
                        {inviteLinkCopied ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Anyone with this link can join your church as a <span className="font-medium">member</span>.{' '}
                      The link is valid for 30 days.{' '}
                      <button
                        type="button"
                        className="text-primary hover:underline font-medium"
                        onClick={handleDeactivateLink}
                      >
                        Deactivate link
                      </button>
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Email Invites */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Invite people via email</label>

              {emailRows.map((row) => (
                <div key={row.id} className="relative rounded-lg border bg-muted/20 p-3">
                  {/* Remove button - top right corner */}
                  {emailRows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border shadow-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeEmailRow(row.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}

                  {/* Row 1: First name | Last name */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Input
                      placeholder="First name"
                      value={row.firstName}
                      onChange={(e) => updateEmailRow(row.id, 'firstName', e.target.value)}
                      className="h-9"
                    />
                    <Input
                      placeholder="Last name"
                      value={row.lastName}
                      onChange={(e) => updateEmailRow(row.id, 'lastName', e.target.value)}
                      className="h-9"
                    />
                  </div>

                  {/* Row 2: Email | Role */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={row.email}
                      onChange={(e) => updateEmailRow(row.id, 'email', e.target.value)}
                      className={cn('h-9 flex-[2] min-w-[200px]', row.error && 'border-destructive focus-visible:ring-destructive')}
                    />
                    <Select
                      value={row.roleId}
                      onValueChange={(value) => updateEmailRow(row.id, 'roleId', value)}
                    >
                      <SelectTrigger className="w-[150px] h-9 shrink-0">
                        <SelectValue>{getRoleName(row.roleId)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map(role => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {row.error && (
                    <p className="text-xs text-destructive mt-1">{row.error}</p>
                  )}
                </div>
              ))}

              {/* Add another email */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary"
                onClick={addEmailRow}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Add another
              </Button>
            </div>

            {/* Submit Button */}
            <Button
              className="w-full mt-5"
              onClick={handleSubmit}
              disabled={isSubmitting || emailRows.every(r => !r.email || r.error)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending invites...
                </>
              ) : (
                'Invite people to my team'
              )}
            </Button>
          </div>

          {/* Right Side - Branding/Cover (30%) */}
          <div className="hidden md:flex flex-col flex-[3] bg-primary/10 relative overflow-hidden min-w-[240px] max-w-[280px]">
            {/* Cover Image */}
            {coverImageUrl ? (
              <div className="absolute inset-0">
                <img
                  src={coverImageUrl}
                  alt={tenantName}
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/50 to-transparent" />
              </div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/30 to-primary/50" />
            )}

            {/* Content Overlay */}
            <div className="relative z-10 flex flex-col h-full p-5 text-primary-foreground">
              {/* Church Logo + Name (same row) */}
              <div className="flex items-center gap-3 mb-auto">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={tenantName}
                    className="w-10 h-10 rounded-lg object-contain bg-white/20 backdrop-blur p-1 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                )}
                <h3 className="text-sm font-semibold text-white leading-tight">{tenantName}</h3>
              </div>

              {/* Feature Highlights */}
              <div className="space-y-3 mt-auto">
                <div className="flex gap-2">
                  <div className="shrink-0 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center mt-0.5">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </div>
                  <p className="text-xs text-white/90">
                    Manage your team with role-based access
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="shrink-0 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center mt-0.5">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </div>
                  <p className="text-xs text-white/90">
                    Collaborate securely with your team
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="shrink-0 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center mt-0.5">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </div>
                  <p className="text-xs text-white/90">
                    Keep your data safe with permissions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Remove Access Confirmation Dialog
// ============================================================================

interface RemoveAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMember | null;
  onConfirm: () => Promise<void>;
}

function RemoveAccessDialog({ open, onOpenChange, member, onConfirm }: RemoveAccessDialogProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleConfirm = async () => {
    setIsRemoving(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsRemoving(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove team member access</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove <strong>{getDisplayName(member)}</strong> from the team?
            This will revoke all their roles and access.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Remove access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TeamMembersSection({
  title = 'Team Members',
  description = 'Manage staff, volunteers, and their access levels',
  tenantId,
  tenantName,
  logoUrl,
  coverImageUrl,
}: TeamMembersSectionProps) {
  // State
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch('/api/rbac/users'),
        fetch('/api/rbac/roles')
      ]);

      if (!usersRes.ok) throw new Error('Failed to fetch team members');
      if (!rolesRes.ok) throw new Error('Failed to fetch roles');

      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();

      setMembers(usersData.data || []);
      setRoles(rolesData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter members
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = getDisplayName(member).toLowerCase();
        const email = member.email.toLowerCase();
        if (!name.includes(query) && !email.includes(query)) {
          return false;
        }
      }

      // Role filter
      if (roleFilter !== 'all') {
        const hasRole = member.roles.some(r => r.id === roleFilter);
        if (!hasRole) return false;
      }

      return true;
    });
  }, [members, searchQuery, roleFilter]);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filteredMembers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMembers.map(m => m.id)));
    }
  };

  const handleSelectMember = (memberId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(memberId)) {
      newSet.delete(memberId);
    } else {
      newSet.add(memberId);
    }
    setSelectedIds(newSet);
  };

  // Role change handler
  const handleRolesChange = async (memberId: string, roleIds: string[]) => {
    try {
      const response = await fetch('/api/rbac/multi-role/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: memberId,
          role_ids: roleIds,
          override_conflicts: true
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update roles');
      }

      toast.success('Roles updated successfully');
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update roles');
      throw err;
    }
  };

  // Remove access handler
  const handleRemoveAccess = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (member) {
      setMemberToRemove(member);
      setRemoveDialogOpen(true);
    }
  };

  const confirmRemoveAccess = async () => {
    if (!memberToRemove) return;

    try {
      // Remove all roles from the user
      for (const role of memberToRemove.roles) {
        await fetch('/api/rbac/multi-role/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: memberToRemove.id,
            role_id: role.id
          }),
        });
      }

      toast.success('Access removed successfully');
      setMemberToRemove(null);
      await fetchData();
    } catch (err) {
      toast.error('Failed to remove access');
      throw err;
    }
  };

  // Invite handler
  const handleInvite = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    roleId: string;
    roleName: string;
  }) => {
    try {
      const response = await fetch('/api/onboarding/team-invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitations: [
            {
              first_name: data.firstName,
              last_name: data.lastName,
              email: data.email,
              role_id: data.roleId,
              role_name: data.roleName,
            }
          ]
        }),
      });

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.error || 'Failed to send invitation');
      }

      const result = await response.json();

      // Check if the invitation was successful
      if (result.results && result.results[0] && !result.results[0].success) {
        throw new Error(result.results[0].error || 'Failed to send invitation');
      }

      toast.success(`Invitation sent to ${data.email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invitation');
      throw err;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading team members...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite people
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members by name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Users className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {roles.map(role => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Members Table */}
      <div className="border rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full">
          {/* Table Header */}
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="w-10 px-4 py-3 text-left">
                <Checkbox
                  checked={selectedIds.size === filteredMembers.length && filteredMembers.length > 0}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
              <th className="w-44 px-4 py-3 text-left text-sm font-medium text-muted-foreground">Team role</th>
              <th className="w-16 px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  {searchQuery || roleFilter !== 'all'
                    ? 'No members match your search criteria'
                    : 'No team members yet. Invite someone to get started.'
                  }
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => {
                const displayName = getDisplayName(member);
                const initials = getInitials(member.first_name, member.last_name, member.email);
                const avatarColor = getAvatarColor(displayName);

                return (
                  <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedIds.has(member.id)}
                        onCheckedChange={() => handleSelectMember(member.id)}
                        aria-label={`Select ${displayName}`}
                      />
                    </td>

                    {/* Name with Avatar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={member.avatar_url} alt={displayName} />
                          <AvatarFallback className={avatarColor}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium whitespace-nowrap">{displayName}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {member.email}
                    </td>

                    {/* Role Multi-Select */}
                    <td className="px-4 py-3">
                      <RoleMultiSelect
                        member={member}
                        availableRoles={roles}
                        onRolesChange={handleRolesChange}
                        onRemoveAccess={handleRemoveAccess}
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">More actions</span>
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRemoveAccess(member.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove access
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Selected Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-background border rounded-lg shadow-lg px-4 py-3 flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              const firstSelected = members.find(m => selectedIds.has(m.id));
              if (firstSelected) {
                setMemberToRemove(firstSelected);
                setRemoveDialogOpen(true);
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove selected
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <InviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        availableRoles={roles}
        members={members}
        tenantId={tenantId}
        tenantName={tenantName}
        logoUrl={logoUrl}
        coverImageUrl={coverImageUrl}
        onInvite={handleInvite}
      />

      <RemoveAccessDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        member={memberToRemove}
        onConfirm={confirmRemoveAccess}
      />
    </div>
  );
}

export default TeamMembersSection;
