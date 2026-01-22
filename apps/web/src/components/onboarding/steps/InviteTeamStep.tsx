'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Users,
  Mail,
  UserPlus,
  Trash2,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface InviteTeamStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface TeamInvitation {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role_id: string;
  role_name: string;
  status: 'pending' | 'sent' | 'error';
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

// ============================================================================
// Role Templates for Onboarding
// ============================================================================

const SUGGESTED_ROLES = [
  { name: 'Pastor', description: 'Senior leadership with full access' },
  { name: 'Administrator', description: 'Administrative access to manage church operations' },
  { name: 'Finance Manager', description: 'Access to financial records and reports' },
  { name: 'Ministry Leader', description: 'Manage ministry teams and schedules' },
  { name: 'Volunteer Coordinator', description: 'Coordinate volunteers and assignments' },
];

// ============================================================================
// Invitation Card Component
// ============================================================================

interface InvitationCardProps {
  invitation: TeamInvitation;
  roles: Role[];
  onUpdate: (id: string, field: 'first_name' | 'last_name' | 'email' | 'role_id', value: string) => void;
  onRemove: (id: string) => void;
}

function InvitationCard({ invitation, roles, onUpdate, onRemove }: InvitationCardProps) {
  const selectedRole = roles.find((r) => r.id === invitation.role_id);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className={cn(
        'border-2 transition-colors',
        invitation.status === 'sent' && 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20',
        invitation.status === 'error' && 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20'
      )}>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Mobile: Stack all fields vertically */}
            {/* Desktop: Two rows - Name & Email on first, Role & Actions on second */}

            {/* Row 1: Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`first-name-${invitation.id}`} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  First Name
                </Label>
                <Input
                  id={`first-name-${invitation.id}`}
                  type="text"
                  placeholder="John"
                  value={invitation.first_name}
                  onChange={(e) => onUpdate(invitation.id, 'first_name', e.target.value)}
                  className="mt-1.5 h-10"
                  disabled={invitation.status === 'sent'}
                />
              </div>
              <div>
                <Label htmlFor={`last-name-${invitation.id}`} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Last Name
                </Label>
                <Input
                  id={`last-name-${invitation.id}`}
                  type="text"
                  placeholder="Doe"
                  value={invitation.last_name}
                  onChange={(e) => onUpdate(invitation.id, 'last_name', e.target.value)}
                  className="mt-1.5 h-10"
                  disabled={invitation.status === 'sent'}
                />
              </div>
            </div>

            {/* Row 2: Email */}
            <div>
              <Label htmlFor={`email-${invitation.id}`} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Email Address
              </Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id={`email-${invitation.id}`}
                  type="email"
                  placeholder="colleague@church.org"
                  value={invitation.email}
                  onChange={(e) => onUpdate(invitation.id, 'email', e.target.value)}
                  className="pl-10 h-10"
                  disabled={invitation.status === 'sent'}
                />
              </div>
            </div>

            {/* Row 3: Role & Actions */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1">
                <Label htmlFor={`role-${invitation.id}`} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Assigned Role
                </Label>
                <Select
                  value={invitation.role_id}
                  onValueChange={(value) => onUpdate(invitation.id, 'role_id', value)}
                  disabled={invitation.status === 'sent'}
                >
                  <SelectTrigger className="mt-1.5 h-10 w-full">
                    <SelectValue placeholder="Select a role">
                      {selectedRole && (
                        <span className="truncate">{selectedRole.name}</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id} className="py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{role.name}</span>
                          {role.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {role.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end sm:justify-start gap-2 sm:pb-0.5">
                {invitation.status === 'sent' ? (
                  <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 h-9 px-3">
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                    Invited
                  </Badge>
                ) : invitation.status === 'error' ? (
                  <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 h-9 px-3">
                    <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                    Error
                  </Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(invitation.id)}
                    className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Remove invitation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function InviteTeamStep({ onComplete, onSkip }: InviteTeamStepProps) {
  const [invitations, setInvitations] = useState<TeamInvitation[]>([
    { id: '1', first_name: '', last_name: '', email: '', role_id: '', role_name: '', status: 'pending' },
  ]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Fetch available roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch('/api/rbac/roles');
        if (response.ok) {
          const data = await response.json();
          // Filter to tenant-scoped roles that are appropriate for team invitations
          const teamRoles = (data.data || []).filter(
            (role: Role) => !['member', 'visitor'].includes(role.name.toLowerCase())
          );
          setRoles(teamRoles.length > 0 ? teamRoles : SUGGESTED_ROLES.map((r, i) => ({
            id: `suggested-${i}`,
            name: r.name,
            description: r.description,
          })));
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
        // Use suggested roles as fallback
        setRoles(SUGGESTED_ROLES.map((r, i) => ({
          id: `suggested-${i}`,
          name: r.name,
          description: r.description,
        })));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoles();
  }, []);

  // Add new invitation
  const addInvitation = () => {
    if (invitations.length >= 10) {
      toast.error('Maximum of 10 invitations at once');
      return;
    }
    setInvitations([
      ...invitations,
      {
        id: String(Date.now()),
        first_name: '',
        last_name: '',
        email: '',
        role_id: '',
        role_name: '',
        status: 'pending',
      },
    ]);
  };

  // Update invitation
  const updateInvitation = (id: string, field: 'first_name' | 'last_name' | 'email' | 'role_id', value: string) => {
    setInvitations((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          const updated = { ...inv, [field]: value };
          if (field === 'role_id') {
            const role = roles.find((r) => r.id === value);
            updated.role_name = role?.name || '';
          }
          return updated;
        }
        return inv;
      })
    );
  };

  // Remove invitation
  const removeInvitation = (id: string) => {
    if (invitations.length === 1) {
      // Reset instead of remove
      setInvitations([{ id: '1', first_name: '', last_name: '', email: '', role_id: '', role_name: '', status: 'pending' }]);
    } else {
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
    }
  };

  // Validate email
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Send invitations
  const sendInvitations = async () => {
    const validInvitations = invitations.filter(
      (inv) => inv.email && inv.role_id && isValidEmail(inv.email) && inv.status === 'pending'
    );

    if (validInvitations.length === 0) {
      toast.error('Please add at least one valid invitation');
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch('/api/onboarding/team-invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitations: validInvitations.map((inv) => ({
            first_name: inv.first_name,
            last_name: inv.last_name,
            email: inv.email,
            role_id: inv.role_id,
            role_name: inv.role_name,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitations');
      }

      // Update invitation statuses based on API response
      setInvitations((prev) =>
        prev.map((inv) => {
          const result = data.results?.find((r: { email: string; success: boolean }) => r.email === inv.email);
          if (result) {
            return { ...inv, status: result.success ? 'sent' as const : 'error' as const };
          }
          return inv;
        })
      );

      // Show appropriate message based on results
      const { summary } = data;
      if (summary.failed === 0) {
        toast.success(`${summary.successful} invitation(s) sent successfully!`);
      } else if (summary.successful > 0) {
        toast.warning(`${summary.successful} sent, ${summary.failed} failed`);
      } else {
        toast.error('Failed to send invitations');
        return; // Don't proceed if all failed
      }

      // Show email config warning if not configured
      if (!data.emailConfigured) {
        toast.info('Invitations created but email sending is not configured');
      }

      onComplete();
    } catch (error) {
      console.error('Error sending invitations:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send invitations');
    } finally {
      setIsSending(false);
    }
  };

  // Check if there are any valid pending invitations
  const hasValidInvitations = invitations.some(
    (inv) => inv.email && inv.role_id && isValidEmail(inv.email) && inv.status === 'pending'
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/10">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Build Your Team</h3>
          <p className="text-muted-foreground">
            Invite your leadership team members. They'll receive an email with a link
            to join and will automatically be assigned the selected role.
          </p>
        </div>
      </div>

      {/* Invitations List */}
      <div className="space-y-4">
        {invitations.map((invitation) => (
          <InvitationCard
            key={invitation.id}
            invitation={invitation}
            roles={roles}
            onUpdate={updateInvitation}
            onRemove={removeInvitation}
          />
        ))}
      </div>

      {/* Add More Button */}
      {invitations.length < 10 && (
        <Button
          variant="outline"
          onClick={addInvitation}
          className="w-full gap-2 border-dashed"
        >
          <UserPlus className="h-4 w-4" />
          Add Another Team Member
        </Button>
      )}

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Team members will receive an email invitation. Once they sign up, they'll
          automatically be added to your church with their assigned role.
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button
          onClick={sendInvitations}
          disabled={!hasValidInvitations || isSending}
          className="flex-1 gap-2"
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending Invitations...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send Invitations
            </>
          )}
        </Button>
        <Button variant="ghost" onClick={onSkip} className="sm:w-auto">
          I'll do this later
        </Button>
      </div>
    </div>
  );
}
