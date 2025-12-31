'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Spinner } from '@/components/ui/spinner';
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
  CheckCircle2
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import type { Role, CreateRoleDto } from '@/models/rbac.model';

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
  const [roles, setRoles] = useState<RoleWithStats[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<RoleWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [showSystemRoles, setShowSystemRoles] = useState(true);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleWithStats | null>(null);
  const [isViewRoleOpen, setIsViewRoleOpen] = useState(false);
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleWithStats | null>(null);
  const [isSimpleView, setIsSimpleView] = useState(false);
  const [isManagePermissionsOpen, setIsManagePermissionsOpen] = useState(false);
  const [managingPermissionsRole, setManagingPermissionsRole] = useState<RoleWithStats | null>(null);

  // Loading states for async operations
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
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

  const handleCreateRole = async (data: CreateRoleDto) => {
    setIsCreatingRole(true);
    try {
      const response = await fetch('/api/rbac/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Role created successfully'
        });
        setIsCreateRoleOpen(false);
        loadData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create role',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error creating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to create role',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingRole(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;

    setDeletingRoleId(roleId);
    try {
      const response = await fetch(`/api/rbac/roles/${roleId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Role deleted successfully'
        });
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
    setSelectedRole(role);
    setIsViewRoleOpen(true);
  };

  const handleEditRole = (role: RoleWithStats) => {
    setEditingRole(role);
    setIsEditRoleOpen(true);
  };

  const handleUpdateRole = async (data: CreateRoleDto) => {
    if (!editingRole) return;

    setIsUpdatingRole(true);
    try {
      const response = await fetch(`/api/rbac/roles/${editingRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Role updated successfully'
        });
        setIsEditRoleOpen(false);
        setEditingRole(null);
        loadData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update role',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update role',
        variant: 'destructive'
      });
    } finally {
      setIsUpdatingRole(false);
    }
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
      {/* Simplified Architecture Notice */}
      <Alert className="border-blue-200 bg-blue-50/50">
        <CheckCircle2 className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-blue-900 font-semibold">RBAC Architecture</AlertTitle>
        <AlertDescription className="text-blue-800">
          The system uses a streamlined 2-layer model: <strong>Users → Roles → Permissions</strong>.
        </AlertDescription>
      </Alert>

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
            <CreateRoleDialog
              open={isCreateRoleOpen}
              onOpenChange={setIsCreateRoleOpen}
              onSubmit={handleCreateRole}
              isCreating={isCreatingRole}
            />
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
                                onClick={() => handleDeleteRole(role.id)}
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

      {/* View Role Dialog */}
      <ViewRoleDialog
        role={selectedRole}
        open={isViewRoleOpen}
        onOpenChange={setIsViewRoleOpen}
      />

      {/* Edit Role Dialog */}
      <EditRoleDialog
        role={editingRole}
        open={isEditRoleOpen}
        onOpenChange={setIsEditRoleOpen}
        onSubmit={handleUpdateRole}
        isUpdating={isUpdatingRole}
      />
    </div>
  );
}

// Create Role Dialog Component
function CreateRoleDialog({
  open,
  onOpenChange,
  onSubmit,
  isCreating
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateRoleDto) => Promise<void>;
  isCreating: boolean;
}) {
  const [formData, setFormData] = useState<CreateRoleDto>({
    name: '',
    description: '',
    scope: 'tenant',
    is_delegatable: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="role-name">Role Name</Label>
            <Input
              id="role-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter role name"
              required
            />
          </div>

          <div>
            <Label htmlFor="role-description">Description</Label>
            <Input
              id="role-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter role description"
            />
          </div>

          <div>
            <Label htmlFor="role-scope">Scope</Label>
            <Select
              value={formData.scope}
              onValueChange={(value: any) => setFormData({ ...formData, scope: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant">Tenant</SelectItem>
                <SelectItem value="campus">Campus</SelectItem>
                <SelectItem value="ministry">Ministry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="role-delegatable"
              checked={formData.is_delegatable}
              onCheckedChange={(checked) => setFormData({ ...formData, is_delegatable: checked })}
            />
            <Label htmlFor="role-delegatable">Allow delegation</Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Role'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to get scope icon
const getScopeIcon = (scope: string) => {
  switch (scope) {
    case 'system': return <Globe className="h-4 w-4" />;
    case 'tenant': return <Building className="h-4 w-4" />;
    case 'campus': return <Church className="h-4 w-4" />;
    case 'ministry': return <Users className="h-4 w-4" />;
    default: return <Settings className="h-4 w-4" />;
  }
};

// Helper function to get scope color
const getScopeColor = (scope: string) => {
  switch (scope) {
    case 'system': return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'tenant': return 'bg-primary/10 text-primary border-primary/20';
    case 'campus': return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400';
    case 'ministry': return 'bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-400';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

// View Role Dialog Component
function ViewRoleDialog({
  role,
  open,
  onOpenChange
}: {
  role: RoleWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [usersWithRole, setUsersWithRole] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    if (role && open) {
      loadUsersWithRole(role.id);
    }
  }, [role, open]);

  const loadUsersWithRole = async (roleId: string) => {
    try {
      setIsLoadingUsers(true);
      const response = await fetch(`/api/rbac/roles/${roleId}/users`);
      const result = await response.json();

      if (result.success) {
        setUsersWithRole(result.data || []);
      } else {
        console.error('Failed to load users for role:', result.error);
        setUsersWithRole([]);
      }
    } catch (error) {
      console.error('Error loading users for role:', error);
      setUsersWithRole([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Role Details: {role.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Name</Label>
              <p className="text-lg font-semibold">{role.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Scope</Label>
              <Badge variant="outline" className={getScopeColor(role.scope)}>
                <span className="flex items-center gap-1">
                  {getScopeIcon(role.scope)}
                  {role.scope}
                </span>
              </Badge>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-600">Description</Label>
            <p className="text-gray-900">{role.description || 'No description provided'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Users Assigned</Label>
              <p className="text-2xl font-bold text-blue-600">{role.user_count || 0}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Direct Permissions</Label>
              <p className="text-2xl font-bold text-green-600">{role.permission_count || 0}</p>
            </div>
          </div>

          {/* Users List Section */}
          <div>
            <Label className="text-sm font-medium text-gray-600 mb-3 block">
              Users with this Role ({usersWithRole.length})
            </Label>
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="text-blue-600" />
                <span className="ml-2 text-sm text-gray-600">Loading users...</span>
              </div>
            ) : usersWithRole.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="py-2">Name</TableHead>
                      <TableHead className="py-2">Email</TableHead>
                      <TableHead className="py-2">Assigned Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersWithRole.map((userRole) => (
                      <TableRow key={userRole.id} className="hover:bg-gray-50">
                        <TableCell className="py-2">
                          <div className="font-medium">
                            {userRole.user?.first_name && userRole.user?.last_name
                              ? `${userRole.user.first_name} ${userRole.user.last_name}`
                              : userRole.user?.email?.split('@')[0] || 'Unknown User'
                            }
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-gray-600">
                          {userRole.user?.email || 'No email available'}
                        </TableCell>
                        <TableCell className="py-2 text-sm text-gray-500">
                          {userRole.assigned_at
                            ? new Date(userRole.assigned_at).toLocaleDateString()
                            : 'Unknown'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No users have been assigned to this role</p>
              </div>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-600">Properties</Label>
            <div className="flex gap-2 mt-2">
              {role.is_system && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  System Role
                </Badge>
              )}
              {role.is_delegatable && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Delegatable
                </Badge>
              )}
              {role.metadata_key && (
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                  Key: {role.metadata_key}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <Label>Created</Label>
              <p>{role.created_at ? new Date(role.created_at).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <Label>Updated</Label>
              <p>{role.updated_at ? new Date(role.updated_at).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Edit Role Dialog Component
function EditRoleDialog({
  role,
  open,
  onOpenChange,
  onSubmit,
  isUpdating
}: {
  role: RoleWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateRoleDto) => Promise<void>;
  isUpdating: boolean;
}) {
  const [formData, setFormData] = useState<CreateRoleDto>({
    name: '',
    description: '',
    scope: 'tenant',
    is_delegatable: false
  });

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description || '',
        scope: role.scope,
        is_delegatable: role.is_delegatable || false,
        metadata_key: role.metadata_key || undefined
      });
    }
  }, [role]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Role: {role.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-role-name">Role Name</Label>
            <Input
              id="edit-role-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter role name"
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-role-description">Description</Label>
            <Input
              id="edit-role-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter role description"
            />
          </div>

          <div>
            <Label htmlFor="edit-role-scope">Scope</Label>
            <Select
              value={formData.scope}
              onValueChange={(value: any) => setFormData({ ...formData, scope: value })}
              disabled={role.is_system}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant">Tenant</SelectItem>
                <SelectItem value="campus">Campus</SelectItem>
                <SelectItem value="ministry">Ministry</SelectItem>
              </SelectContent>
            </Select>
            {role.is_system && (
              <p className="text-xs text-gray-500 mt-1">System roles cannot change scope</p>
            )}
          </div>

          <div>
            <Label htmlFor="edit-role-metadata-key">Metadata Key</Label>
            <Input
              id="edit-role-metadata-key"
              value={formData.metadata_key || ''}
              onChange={(e) => setFormData({ ...formData, metadata_key: e.target.value })}
              placeholder="Optional metadata key"
            />
          </div>

          {!role.is_system && (
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-role-delegatable"
                checked={formData.is_delegatable}
                onCheckedChange={(checked) => setFormData({ ...formData, is_delegatable: checked })}
              />
              <Label htmlFor="edit-role-delegatable">Allow delegation</Label>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Role'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}