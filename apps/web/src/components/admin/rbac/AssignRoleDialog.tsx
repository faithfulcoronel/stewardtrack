'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Loader2,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description?: string;
  scope: string;
  is_system: boolean;
  is_delegatable: boolean;
  metadata_key?: string;
}

interface UserRole {
  role_id: string;
  assigned_at: string;
  expires_at?: string;
}

interface AssignRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userEmail: string;
  currentRoles: UserRole[];
  onSuccess: () => void;
}

export function AssignRoleDialog({
  open,
  onOpenChange,
  userId,
  userName,
  userEmail,
  currentRoles,
  onSuccess,
}: AssignRoleDialogProps) {
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track which roles are currently assigned
  const currentRoleIds = new Set(currentRoles.map(ur => ur.role_id));

  useEffect(() => {
    if (open) {
      loadRoles();
      // Initialize selected roles with current assignments
      setSelectedRoleIds(new Set(currentRoles.map(ur => ur.role_id)));
    }
  }, [open, currentRoles]);

  const loadRoles = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/rbac/roles?includeSystem=true&includeStats=true');
      const result = await response.json();

      if (result.success) {
        setAvailableRoles(result.data || []);
      } else {
        setError(result.error || 'Failed to load roles');
      }
    } catch (err) {
      console.error('Error loading roles:', err);
      setError('Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    const newSelected = new Set(selectedRoleIds);
    if (checked) {
      newSelected.add(roleId);
    } else {
      newSelected.delete(roleId);
    }
    setSelectedRoleIds(newSelected);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Determine which roles to add and which to remove
      const rolesToAdd = [...selectedRoleIds].filter(id => !currentRoleIds.has(id));
      const rolesToRemove = [...currentRoleIds].filter(id => !selectedRoleIds.has(id));

      // Assign new roles
      for (const roleId of rolesToAdd) {
        const response = await fetch(`/api/rbac/users/${userId}/roles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role_id: roleId }),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || `Failed to assign role`);
        }
      }

      // Revoke removed roles
      for (const roleId of rolesToRemove) {
        const response = await fetch(`/api/rbac/users/${userId}/roles/${roleId}`, {
          method: 'DELETE',
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || `Failed to revoke role`);
        }
      }

      const changes = rolesToAdd.length + rolesToRemove.length;
      if (changes > 0) {
        toast.success(`Updated ${changes} role assignment(s) for ${userName}`);
      } else {
        toast.info('No changes made');
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error saving role assignments:', err);
      setError(err.message || 'Failed to save role assignments');
      toast.error(err.message || 'Failed to save role assignments');
    } finally {
      setIsSaving(false);
    }
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'system':
        return 'bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-400';
      case 'tenant':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'delegated':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const hasChanges = () => {
    if (selectedRoleIds.size !== currentRoleIds.size) return true;
    for (const id of selectedRoleIds) {
      if (!currentRoleIds.has(id)) return true;
    }
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Assign Roles
          </DialogTitle>
          <DialogDescription>
            Assign or revoke roles for <strong>{userName}</strong> ({userEmail})
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" className="text-primary" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Select the roles you want to assign to this user. Uncheck to revoke existing roles.
              </AlertDescription>
            </Alert>

            <div className="flex-1 overflow-y-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Assign</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableRoles.map((role) => {
                    const isCurrentlyAssigned = currentRoleIds.has(role.id);
                    const isSelected = selectedRoleIds.has(role.id);
                    const willBeAdded = isSelected && !isCurrentlyAssigned;
                    const willBeRemoved = !isSelected && isCurrentlyAssigned;

                    return (
                      <TableRow
                        key={role.id}
                        className={
                          willBeAdded
                            ? 'bg-emerald-500/5'
                            : willBeRemoved
                            ? 'bg-destructive/5'
                            : ''
                        }
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleRoleToggle(role.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {role.name}
                              {role.is_system && (
                                <Badge variant="outline" className="text-xs">
                                  System
                                </Badge>
                              )}
                            </div>
                            {role.description && (
                              <p className="text-sm text-muted-foreground">
                                {role.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getScopeColor(role.scope)}>
                            {role.scope}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {willBeAdded ? (
                            <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Will be assigned
                            </Badge>
                          ) : willBeRemoved ? (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                              <ShieldX className="h-3 w-3 mr-1" />
                              Will be revoked
                            </Badge>
                          ) : isCurrentlyAssigned ? (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Assigned
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not assigned</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {availableRoles.length === 0 && (
              <div className="text-center py-8">
                <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No roles available</p>
              </div>
            )}
          </>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading || !hasChanges()}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
