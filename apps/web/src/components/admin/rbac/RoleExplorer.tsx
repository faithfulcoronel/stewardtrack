'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Key,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Shield,
  Settings,
  Building,
  Church,
  Globe,
  HelpCircle,
  Layout,
  Layers,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import type { Role } from '@/models/rbac.model';

interface RoleWithStats extends Role {
  user_count: number;
  permission_count: number;
}

interface Permission {
  id: string;
  name: string;
  code: string;
  description?: string;
  module?: string;
  action?: string;
}

export function RoleExplorer() {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleWithStats[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<RoleWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [showSystemRoles, setShowSystemRoles] = useState(true);
  const [isSimpleView, setIsSimpleView] = useState(false);

  // Delete confirmation dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleWithStats | null>(null);

  // Loading states for async operations
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [showSystemRoles]);

  useEffect(() => {
    filterData();
  }, [roles, searchTerm, scopeFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [rolesRes, permissionsRes] = await Promise.all([
        fetch(`/api/rbac/roles?includeSystem=${showSystemRoles}&includeStats=true`),
        fetch('/api/rbac/permissions')
      ]);

      const [rolesData, permissionsData] = await Promise.all([
        rolesRes.json(),
        permissionsRes.json()
      ]);

      if (rolesData.success) {
        setRoles(rolesData.data);
      }

      if (permissionsData.success) {
        setPermissions(permissionsData.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load roles and permissions',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = () => {
    let filtered = roles;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(role =>
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by scope
    if (scopeFilter !== 'all') {
      filtered = filtered.filter(role => role.scope === scopeFilter);
    }

    setFilteredRoles(filtered);
  };

  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'system': return <Globe className="h-4 w-4" />;
      case 'tenant': return <Building className="h-4 w-4" />;
      case 'campus': return <Church className="h-4 w-4" />;
      case 'ministry': return <Users className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'system': return 'bg-destructive/10 text-destructive border-destructive/20 shadow-sm';
      case 'tenant': return 'bg-primary/10 text-primary border-primary/20 shadow-sm';
      case 'campus': return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 shadow-sm dark:text-emerald-400';
      case 'ministry': return 'bg-violet-500/10 text-violet-700 border-violet-500/20 shadow-sm dark:text-violet-400';
      default: return 'bg-muted text-muted-foreground border-border shadow-sm';
    }
  };

  const getScopeDescription = (scope: string) => {
    switch (scope) {
      case 'system': return 'Platform-wide system roles with administrative access';
      case 'tenant': return 'Organization-level access across all campuses and ministries';
      case 'campus': return 'Campus-specific access for single location management';
      case 'ministry': return 'Ministry-specific access for department operations';
      default: return 'Standard access level';
    }
  };

  const handleCreateRole = () => {
    router.push('/admin/security/rbac/roles/create');
  };

  const handleDeleteClick = (role: RoleWithStats) => {
    setRoleToDelete(role);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    setDeletingRoleId(roleToDelete.id);
    try {
      const response = await fetch(`/api/rbac/roles/${roleToDelete.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Role deleted successfully'
        });
        setIsDeleteDialogOpen(false);
        setRoleToDelete(null);
        loadData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete role',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete role',
        variant: 'destructive'
      });
    } finally {
      setDeletingRoleId(null);
    }
  };

  const handleViewRole = (role: RoleWithStats) => {
    router.push(`/admin/security/rbac/roles/${role.id}`);
  };

  const handleEditRole = (role: RoleWithStats) => {
    router.push(`/admin/security/rbac/roles/${role.id}?mode=edit`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/4 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Roles</p>
                <p className="text-3xl font-bold text-blue-600">{roles.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Permissions</p>
                <p className="text-3xl font-bold text-green-600">{permissions.length}</p>
              </div>
              <Key className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Roles</p>
                <p className="text-3xl font-bold text-red-600">
                  {roles.filter(r => r.is_system).length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Top Row - Search and View Toggle */}
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="search" className="flex items-center gap-2">
                  Search
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Search by role name, description, or metadata key</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search roles..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="simple-view"
                  checked={isSimpleView}
                  onCheckedChange={setIsSimpleView}
                />
                <Label htmlFor="simple-view" className="text-sm flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  Simple View
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Hide complex features and show only essential information for easier management</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
              </div>
            </div>

            {/* Second Row - Filters (hidden in simple view) */}
            {!isSimpleView && (
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-48">
                  <Label className="flex items-center gap-2">
                    Scope Filter
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Filter by organizational scope level</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Select value={scopeFilter} onValueChange={setScopeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          All Scopes
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          System
                        </div>
                      </SelectItem>
                      <SelectItem value="tenant">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Organization
                        </div>
                      </SelectItem>
                      <SelectItem value="campus">
                        <div className="flex items-center gap-2">
                          <Church className="h-4 w-4" />
                          Campus
                        </div>
                      </SelectItem>
                      <SelectItem value="ministry">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Ministry
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-system"
                    checked={showSystemRoles}
                    onCheckedChange={setShowSystemRoles}
                  />
                  <Label htmlFor="show-system" className="text-sm flex items-center gap-2">
                    Include System Roles
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Show platform system roles (typically managed by administrators)</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                </div>
              </div>
            )}

            {/* Scope Visual Tags */}
            {!isSimpleView && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600 mr-2">Quick Filters:</span>
                {['system', 'tenant', 'campus', 'ministry'].map((scope) => {
                  const isActive = scopeFilter === scope;
                  return (
                    <Button
                      key={scope}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => setScopeFilter(isActive ? 'all' : scope)}
                      className={`
                        h-auto px-3 py-1 rounded-full text-xs font-medium
                        ${isActive ? getScopeColor(scope) : ''}
                      `}
                    >
                      {getScopeIcon(scope)}
                      <span className="ml-1">{scope}</span>
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Roles ({filteredRoles.length})</CardTitle>
              <CardDescription>Direct role-to-permission assignments</CardDescription>
            </div>
            <Button onClick={handleCreateRole}>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Scope</TableHead>
                {!isSimpleView && <TableHead>Description</TableHead>}
                <TableHead>Users</TableHead>
                <TableHead>Permissions</TableHead>
                {!isSimpleView && <TableHead>Status</TableHead>}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {role.name}
                      {role.is_system && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Shield className="h-4 w-4 text-red-600" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>System role - managed by platform administrators</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className={getScopeColor(role.scope)}>
                          <span className="flex items-center gap-1">
                            {getScopeIcon(role.scope)}
                            {role.scope}
                          </span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{getScopeDescription(role.scope)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  {!isSimpleView && (
                    <TableCell className="max-w-xs truncate">
                      {role.description || 'No description'}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-gray-400" />
                      {role.user_count || 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Key className="h-4 w-4 text-gray-400" />
                      {role.permission_count || 0}
                    </div>
                  </TableCell>
                  {!isSimpleView && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {role.is_system && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            System
                          </Badge>
                        )}
                        {role.is_delegatable && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Delegatable
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewRole(role)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View role details and assignments</p>
                        </TooltipContent>
                      </Tooltip>
                      {!role.is_system && !isSimpleView && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditRole(role)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit role properties and permissions</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteClick(role)}
                                disabled={deletingRoleId === role.id}
                              >
                                {deletingRoleId === role.id ? (
                                  <Loader2 className="h-4 w-4 text-red-600 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete role (cannot be undone)</p>
                            </TooltipContent>
                          </Tooltip>
                        </>
                      )}
                      {!role.is_system && isSimpleView && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditRole(role)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit role</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Role Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Role
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role <strong>&quot;{roleToDelete?.name}&quot;</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {roleToDelete && (roleToDelete.user_count ?? 0) > 0 && (
            <Alert variant="destructive" className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This role is currently assigned to {roleToDelete.user_count} user(s).
                Deleting it will remove the role from all assigned users.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setRoleToDelete(null);
              }}
              disabled={deletingRoleId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRole}
              disabled={deletingRoleId !== null}
            >
              {deletingRoleId !== null ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Role
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}