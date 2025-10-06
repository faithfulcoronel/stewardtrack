'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Key,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Shield,
  Settings,
  Building,
  Church,
  Globe,
  UserPlus,
  HelpCircle,
  Layout,
  Layers,
  Loader2
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import type { Role, PermissionBundle, Permission, CreateRoleDto, CreatePermissionBundleDto } from '@/models/rbac.model';

interface RoleWithStats extends Role {
  user_count: number;
  bundle_count: number;
}

interface BundleWithStats extends PermissionBundle {
  role_count: number;
  permission_count: number;
}

const ROLE_SCOPE_FILTERS = ['all', 'system', 'tenant', 'campus', 'ministry'] as const;
type ScopeFilter = (typeof ROLE_SCOPE_FILTERS)[number];

const QUICK_SCOPE_FILTERS: ScopeFilter[] = ['system', 'tenant', 'campus', 'ministry'];

const ROLE_CREATION_SCOPES = ['tenant', 'campus', 'ministry'] as const;
type RoleCreationScope = (typeof ROLE_CREATION_SCOPES)[number];

const BUNDLE_SCOPE_VALUES = ['tenant', 'campus', 'ministry'] as const;
type BundleScope = (typeof BUNDLE_SCOPE_VALUES)[number];

interface RoleUserAssignment {
  id: string;
  user_id: string;
  assigned_at: string | null;
  assigned_by: string | null;
  user: {
    id: string;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
  };
}

type ApiSuccess<T> = { success: true; data: T };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isScopeFilter = (value: string): value is ScopeFilter =>
  ROLE_SCOPE_FILTERS.includes(value as ScopeFilter);

const isRoleCreationScope = (value: string): value is RoleCreationScope =>
  ROLE_CREATION_SCOPES.includes(value as RoleCreationScope);

const isBundleScope = (value: string): value is BundleScope =>
  BUNDLE_SCOPE_VALUES.includes(value as BundleScope);

const isApiSuccessResponse = <T,>(
  value: unknown,
  predicate: (data: unknown) => data is T,
): value is ApiSuccess<T> => {
  if (!isRecord(value) || value.success !== true || !('data' in value)) {
    return false;
  }
  return predicate((value as { data: unknown }).data);
};

const isRoleWithStats = (value: unknown): value is RoleWithStats => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.scope === 'string' &&
    typeof value.user_count === 'number' &&
    typeof value.bundle_count === 'number'
  );
};

const isRoleWithStatsArray = (value: unknown): value is RoleWithStats[] =>
  Array.isArray(value) && value.every(isRoleWithStats);

const isBundleWithStats = (value: unknown): value is BundleWithStats => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.scope === 'string' &&
    typeof value.role_count === 'number' &&
    typeof value.permission_count === 'number'
  );
};

const isBundleWithStatsArray = (value: unknown): value is BundleWithStats[] =>
  Array.isArray(value) && value.every(isBundleWithStats);

const isPermissionRecord = (value: unknown): value is Permission => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.code === 'string' &&
    typeof value.name === 'string' &&
    typeof value.module === 'string' &&
    typeof value.category === 'string' &&
    typeof value.is_active === 'boolean' &&
    typeof value.tenant_id === 'string' &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string'
  );
};

const isPermissionArray = (value: unknown): value is Permission[] =>
  Array.isArray(value) && value.every(isPermissionRecord);

const isRoleUserAssignment = (value: unknown): value is RoleUserAssignment => {
  if (!isRecord(value)) {
    return false;
  }
  const user = (value as Record<string, unknown>).user;
  if (!isRecord(user)) {
    return false;
  }
  const assignedBy = (value as Record<string, unknown>).assigned_by;
  return (
    typeof value.id === 'string' &&
    typeof value.user_id === 'string' &&
    (value.assigned_at === null || typeof value.assigned_at === 'string') &&
    (assignedBy === null || assignedBy === undefined || typeof assignedBy === 'string') &&
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    (user.first_name === undefined || user.first_name === null || typeof user.first_name === 'string') &&
    (user.last_name === undefined || user.last_name === null || typeof user.last_name === 'string')
  );
};

const isRoleUserAssignmentArray = (value: unknown): value is RoleUserAssignment[] =>
  Array.isArray(value) && value.every(isRoleUserAssignment);

const formatDate = (value?: string | null): string => {
  if (!value) {
    return 'Unknown';
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unknown' : parsed.toLocaleDateString();
};

export function RoleExplorer() {
  const [roles, setRoles] = useState<RoleWithStats[]>([]);
  const [bundles, setBundles] = useState<BundleWithStats[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<RoleWithStats[]>([]);
  const [filteredBundles, setFilteredBundles] = useState<BundleWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [showSystemRoles, setShowSystemRoles] = useState(true);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [isCreateBundleOpen, setIsCreateBundleOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleWithStats | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<BundleWithStats | null>(null);
  const [isViewRoleOpen, setIsViewRoleOpen] = useState(false);
  const [isViewBundleOpen, setIsViewBundleOpen] = useState(false);
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [isEditBundleOpen, setIsEditBundleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleWithStats | null>(null);
  const [editingBundle, setEditingBundle] = useState<BundleWithStats | null>(null);
  const [isSimpleView, setIsSimpleView] = useState(false);
  const [scopeCategories, setScopeCategories] = useState<ScopeFilter[]>(['all']);

  // Loading states for async operations
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [isCreatingBundle, setIsCreatingBundle] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [isUpdatingBundle, setIsUpdatingBundle] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [deletingBundleId, setDeletingBundleId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [showSystemRoles]);

  useEffect(() => {
    filterData();
  }, [roles, bundles, searchTerm, scopeFilter]);

  const handleScopeFilterChange = (value: string) => {
    if (isScopeFilter(value)) {
      setScopeFilter(value);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [rolesRes, bundlesRes, permissionsRes] = await Promise.all([
        fetch(`/api/rbac/roles?includeSystem=${showSystemRoles}&includeStats=true`),
        fetch('/api/rbac/bundles?includeStats=true'),
        fetch('/api/rbac/permissions')
      ]);

      const [rolesPayload, bundlesPayload, permissionsPayload] = await Promise.all([
        rolesRes.json() as Promise<unknown>,
        bundlesRes.json() as Promise<unknown>,
        permissionsRes.json() as Promise<unknown>
      ]);

      if (isApiSuccessResponse<RoleWithStats[]>(rolesPayload, isRoleWithStatsArray)) {
        setRoles(rolesPayload.data);
      } else {
        setRoles([]);
      }

      if (isApiSuccessResponse<BundleWithStats[]>(bundlesPayload, isBundleWithStatsArray)) {
        setBundles(bundlesPayload.data);
      } else {
        setBundles([]);
      }

      if (isApiSuccessResponse<Permission[]>(permissionsPayload, isPermissionArray)) {
        setPermissions(permissionsPayload.data);
      } else {
        setPermissions([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load roles and bundles');
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

    // Filter bundles similarly
    let filteredBundleList = bundles;

    if (searchTerm) {
      filteredBundleList = filteredBundleList.filter(bundle =>
        bundle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bundle.description && bundle.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (scopeFilter !== 'all') {
      filteredBundleList = filteredBundleList.filter(bundle => bundle.scope === scopeFilter);
    }

    setFilteredBundles(filteredBundleList);
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
        toast.success('Role created successfully');
        setIsCreateRoleOpen(false);
        loadData();
      } else {
        toast.error(result.error || 'Failed to create role');
      }
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error('Failed to create role');
    } finally {
      setIsCreatingRole(false);
    }
  };

  const handleCreateBundle = async (data: CreatePermissionBundleDto) => {
    setIsCreatingBundle(true);
    try {
      const response = await fetch('/api/rbac/bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Permission bundle created successfully');
        setIsCreateBundleOpen(false);
        loadData();
      } else {
        toast.error(result.error || 'Failed to create bundle');
      }
    } catch (error) {
      console.error('Error creating bundle:', error);
      toast.error('Failed to create bundle');
    } finally {
      setIsCreatingBundle(false);
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
        toast.success('Role deleted successfully');
        loadData();
      } else {
        toast.error(result.error || 'Failed to delete role');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    } finally {
      setDeletingRoleId(null);
    }
  };

  const handleDeleteBundle = async (bundleId: string) => {
    if (!confirm('Are you sure you want to delete this bundle?')) return;

    setDeletingBundleId(bundleId);
    try {
      const response = await fetch(`/api/rbac/bundles/${bundleId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Bundle deleted successfully');
        loadData();
      } else {
        toast.error(result.error || 'Failed to delete bundle');
      }
    } catch (error) {
      console.error('Error deleting bundle:', error);
      toast.error('Failed to delete bundle');
    } finally {
      setDeletingBundleId(null);
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
        toast.success('Role updated successfully');
        setIsEditRoleOpen(false);
        setEditingRole(null);
        loadData();
      } else {
        toast.error(result.error || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleViewBundle = (bundle: BundleWithStats) => {
    setSelectedBundle(bundle);
    setIsViewBundleOpen(true);
  };

  const handleEditBundle = (bundle: BundleWithStats) => {
    setEditingBundle(bundle);
    setIsEditBundleOpen(true);
  };

  const handleUpdateBundle = async (data: CreatePermissionBundleDto) => {
    if (!editingBundle) return;

    setIsUpdatingBundle(true);
    try {
      const response = await fetch(`/api/rbac/bundles/${editingBundle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Bundle updated successfully');
        setIsEditBundleOpen(false);
        setEditingBundle(null);
        loadData();
      } else {
        toast.error(result.error || 'Failed to update bundle');
      }
    } catch (error) {
      console.error('Error updating bundle:', error);
      toast.error('Failed to update bundle');
    } finally {
      setIsUpdatingBundle(false);
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
                <p className="text-sm font-medium text-gray-600">Permission Bundles</p>
                <p className="text-3xl font-bold text-green-600">{bundles.length}</p>
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
                      <p>Search by role/bundle name, description, or metadata key</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search roles and bundles..."
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
                  <Select value={scopeFilter} onValueChange={handleScopeFilterChange}>
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
                {QUICK_SCOPE_FILTERS.map((scope) => {
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="roles" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="roles">Roles ({filteredRoles.length})</TabsTrigger>
            <TabsTrigger value="bundles">Bundles ({filteredBundles.length})</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <CreateRoleDialog
              open={isCreateRoleOpen}
              onOpenChange={setIsCreateRoleOpen}
              onSubmit={handleCreateRole}
              isCreating={isCreatingRole}
            />

            <CreateBundleDialog
              open={isCreateBundleOpen}
              onOpenChange={setIsCreateBundleOpen}
              onSubmit={handleCreateBundle}
              isCreating={isCreatingBundle}
              availablePermissions={permissions}
            />
          </div>
        </div>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle>Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Scope</TableHead>
                    {!isSimpleView && <TableHead>Description</TableHead>}
                    <TableHead>Users</TableHead>
                    {!isSimpleView && <TableHead>Bundles</TableHead>}
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
                          {role.user_count}
                        </div>
                      </TableCell>
                      {!isSimpleView && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Key className="h-4 w-4 text-gray-400" />
                            {role.bundle_count}
                          </div>
                        </TableCell>
                      )}
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
        </TabsContent>

        <TabsContent value="bundles">
          <Card>
            <CardHeader>
              <CardTitle>Permission Bundles</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Scope</TableHead>
                    {!isSimpleView && <TableHead>Description</TableHead>}
                    <TableHead>Roles</TableHead>
                    {!isSimpleView && <TableHead>Permissions</TableHead>}
                    {!isSimpleView && <TableHead>Status</TableHead>}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBundles.map((bundle) => (
                    <TableRow key={bundle.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {bundle.name}
                          {bundle.is_template && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Template
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Reusable template bundle</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className={getScopeColor(bundle.scope)}>
                              <span className="flex items-center gap-1">
                                {getScopeIcon(bundle.scope)}
                                {bundle.scope}
                              </span>
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{getScopeDescription(bundle.scope)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      {!isSimpleView && (
                        <TableCell className="max-w-xs truncate">
                          {bundle.description || 'No description'}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-gray-400" />
                          {bundle.role_count}
                        </div>
                      </TableCell>
                      {!isSimpleView && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Key className="h-4 w-4 text-gray-400" />
                            {bundle.permission_count}
                          </div>
                        </TableCell>
                      )}
                      {!isSimpleView && (
                        <TableCell>
                          {bundle.is_template && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Template
                            </Badge>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewBundle(bundle)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View bundle details and permissions</p>
                            </TooltipContent>
                          </Tooltip>
                          {!isSimpleView && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditBundle(bundle)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Edit bundle properties and permissions</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteBundle(bundle.id)}
                                    disabled={deletingBundleId === bundle.id}
                                  >
                                    {deletingBundleId === bundle.id ? (
                                      <Loader2 className="h-4 w-4 text-red-600 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Delete bundle (cannot be undone)</p>
                                </TooltipContent>
                              </Tooltip>
                            </>
                          )}
                          {isSimpleView && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditBundle(bundle)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit bundle</p>
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
        </TabsContent>
      </Tabs>

      {/* View Role Dialog */}
      <ViewRoleDialog
        role={selectedRole}
        open={isViewRoleOpen}
        onOpenChange={setIsViewRoleOpen}
      />

      {/* View Bundle Dialog */}
      <ViewBundleDialog
        bundle={selectedBundle}
        open={isViewBundleOpen}
        onOpenChange={setIsViewBundleOpen}
      />

      {/* Edit Role Dialog */}
      <EditRoleDialog
        role={editingRole}
        open={isEditRoleOpen}
        onOpenChange={setIsEditRoleOpen}
        onSubmit={handleUpdateRole}
        isUpdating={isUpdatingRole}
      />

      {/* Edit Bundle Dialog */}
      <EditBundleDialog
        bundle={editingBundle}
        open={isEditBundleOpen}
        onOpenChange={setIsEditBundleOpen}
        onSubmit={handleUpdateBundle}
        isUpdating={isUpdatingBundle}
        availablePermissions={permissions}
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
              onValueChange={(value) => {
                if (isRoleCreationScope(value)) {
                  setFormData({ ...formData, scope: value });
                }
              }}
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
  const [usersWithRole, setUsersWithRole] = useState<RoleUserAssignment[]>([]);
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
      const result: unknown = await response.json();

      if (isApiSuccessResponse<RoleUserAssignment[]>(result, isRoleUserAssignmentArray)) {
        setUsersWithRole(result.data);
      } else {
        if (isRecord(result) && 'error' in result) {
          console.error('Failed to load users for role:', (result as { error?: unknown }).error);
        } else {
          console.error('Failed to load users for role:', result);
        }
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" widthMode='content'>
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
              <p className="text-2xl font-bold text-blue-600">{role.user_count}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Permission Bundles</Label>
              <p className="text-2xl font-bold text-green-600">{role.bundle_count}</p>
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
                          {formatDate(userRole.assigned_at ?? undefined)}
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
              <p>{formatDate(role.created_at)}</p>
            </div>
            <div>
              <Label>Updated</Label>
              <p>{formatDate(role.updated_at)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// View Bundle Dialog Component
function ViewBundleDialog({
  bundle,
  open,
  onOpenChange
}: {
  bundle: BundleWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [bundlePermissions, setBundlePermissions] = useState<Permission[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);

  useEffect(() => {
    if (bundle && open) {
      loadBundlePermissions(bundle.id);
    }
  }, [bundle, open]);

  const loadBundlePermissions = async (bundleId: string) => {
    try {
      setIsLoadingPermissions(true);
      const response = await fetch(`/api/rbac/bundles/${bundleId}/permissions`);
      const result: unknown = await response.json();

      if (isApiSuccessResponse<Permission[]>(result, isPermissionArray)) {
        setBundlePermissions(result.data);
      } else {
        if (isRecord(result) && 'error' in result) {
          console.error('Failed to load permissions for bundle:', (result as { error?: unknown }).error);
        } else {
          console.error('Failed to load permissions for bundle:', result);
        }
        setBundlePermissions([]);
      }
    } catch (error) {
      console.error('Error loading permissions for bundle:', error);
      setBundlePermissions([]);
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  const getModuleIcon = (module: string) => {
    switch (module.toLowerCase()) {
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'financial': return <Key className="h-4 w-4" />;
      case 'members': return <Users className="h-4 w-4" />;
      case 'events': return <Building className="h-4 w-4" />;
      case 'communications': return <Settings className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getModuleColor = (module: string) => {
    switch (module.toLowerCase()) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'financial': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'members': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'events': return 'bg-green-100 text-green-800 border-green-200';
      case 'communications': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!bundle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" widthMode='content'>
        <DialogHeader>
          <DialogTitle>Bundle Details: {bundle.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Name</Label>
              <p className="text-lg font-semibold">{bundle.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Scope</Label>
              <Badge variant="outline" className={getScopeColor(bundle.scope)}>
                <span className="flex items-center gap-1">
                  {getScopeIcon(bundle.scope)}
                  {bundle.scope}
                </span>
              </Badge>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-600">Description</Label>
            <p className="text-gray-900">{bundle.description || 'No description provided'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Used by Roles</Label>
              <p className="text-2xl font-bold text-purple-600">{bundle.role_count}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Total Permissions</Label>
              <p className="text-2xl font-bold text-green-600">{bundle.permission_count}</p>
            </div>
          </div>

          {/* Permissions List Section */}
          <div>
            <Label className="text-sm font-medium text-gray-600 mb-3 block">
              Permissions in this Bundle ({bundlePermissions.length})
            </Label>
            {isLoadingPermissions ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="text-green-600" />
                <span className="ml-2 text-sm text-gray-600">Loading permissions...</span>
              </div>
            ) : bundlePermissions.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="py-2">Permission</TableHead>
                      <TableHead className="py-2">Module</TableHead>
                      <TableHead className="py-2">Action</TableHead>
                      <TableHead className="py-2">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bundlePermissions.map((permission) => (
                      <TableRow key={permission.id} className="hover:bg-gray-50">
                        <TableCell className="py-2">
                          <div className="font-medium">{permission.name}</div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className={getModuleColor(permission.module)}>
                            <span className="flex items-center gap-1">
                              {getModuleIcon(permission.module)}
                              {permission.module}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-gray-600">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {permission.action ?? permission.code}
                          </code>
                        </TableCell>
                        <TableCell className="py-2 text-sm text-gray-600">
                          {permission.description || 'No description'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Key className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No permissions have been added to this bundle</p>
              </div>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-600">Properties</Label>
            <div className="flex gap-2 mt-2">
              {bundle.is_template && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Template
                </Badge>
              )}
              {bundle.metadata_key && (
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                  Key: {bundle.metadata_key}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <Label>Created</Label>
              <p>{formatDate(bundle.created_at)}</p>
            </div>
            <div>
              <Label>Updated</Label>
              <p>{formatDate(bundle.updated_at)}</p>
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
              onValueChange={(value) => {
                if (isRoleCreationScope(value)) {
                  setFormData({ ...formData, scope: value });
                }
              }}
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

// Edit Bundle Dialog Component
function EditBundleDialog({
  bundle,
  open,
  onOpenChange,
  onSubmit,
  isUpdating,
  availablePermissions
}: {
  bundle: BundleWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePermissionBundleDto) => Promise<void>;
  isUpdating: boolean;
  availablePermissions: Permission[];
}) {
  const [formData, setFormData] = useState<CreatePermissionBundleDto>({
    name: '',
    description: '',
    scope: 'tenant',
    is_template: false,
    permission_ids: []
  });
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  useEffect(() => {
    if (bundle) {
      setFormData({
        name: bundle.name,
        description: bundle.description || '',
        scope: bundle.scope,
        is_template: bundle.is_template || false,
        metadata_key: bundle.metadata_key || undefined,
        permission_ids: []
      });
      // Load bundle permissions
      loadBundlePermissions(bundle.id);
    }
  }, [bundle]);

  const loadBundlePermissions = async (bundleId: string) => {
    try {
      setLoadingPermissions(true);
      const response = await fetch(`/api/rbac/bundles/${bundleId}/permissions`);
      const result: unknown = await response.json();

      if (isApiSuccessResponse<Permission[]>(result, isPermissionArray)) {
        const permissionIds = result.data.map((permission) => permission.id);
        setFormData(prev => ({ ...prev, permission_ids: permissionIds }));
      }
    } catch (error) {
      console.error('Error loading bundle permissions:', error);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!bundle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Bundle: {bundle.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-bundle-name">Bundle Name</Label>
            <Input
              id="edit-bundle-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter bundle name"
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-bundle-description">Description</Label>
            <Input
              id="edit-bundle-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter bundle description"
            />
          </div>

          <div>
            <Label htmlFor="edit-bundle-scope">Scope</Label>
            <Select
              value={formData.scope}
              onValueChange={(value) => {
                if (isBundleScope(value)) {
                  setFormData({ ...formData, scope: value });
                }
              }}
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

          <div>
            <Label className="mb-2 block">Select Permissions</Label>
            {loadingPermissions ? (
              <div className="border rounded-md p-4 text-center">
                <Spinner className="mx-auto" />
                <p className="text-sm text-gray-500 mt-2">Loading permissions...</p>
              </div>
            ) : (
              <div className="border rounded-md p-4 max-h-64 overflow-y-auto space-y-2">
                {availablePermissions.length > 0 ? (
                  availablePermissions.map((permission) => (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-permission-${permission.id}`}
                        checked={formData.permission_ids?.includes(permission.id) || false}
                        onCheckedChange={(checked) => {
                          const currentIds = formData.permission_ids || [];
                          if (checked) {
                            setFormData({ ...formData, permission_ids: [...currentIds, permission.id] });
                          } else {
                            setFormData({ ...formData, permission_ids: currentIds.filter(id => id !== permission.id) });
                          }
                        }}
                      />
                      <Label htmlFor={`edit-permission-${permission.id}`} className="text-sm font-normal cursor-pointer flex-1">
                        <div>
                          <span className="font-medium">{permission.name}</span>
                          {permission.description && (
                            <span className="text-xs text-gray-500 block">{permission.description}</span>
                          )}
                        </div>
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No permissions available</p>
                )}
              </div>
            )}
            {formData.permission_ids && formData.permission_ids.length > 0 && (
              <p className="text-xs text-gray-600 mt-1">
                {formData.permission_ids.length} permission(s) selected
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="edit-bundle-metadata-key">Metadata Key</Label>
            <Input
              id="edit-bundle-metadata-key"
              value={formData.metadata_key || ''}
              onChange={(e) => setFormData({ ...formData, metadata_key: e.target.value })}
              placeholder="Optional metadata key"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="edit-bundle-template"
              checked={formData.is_template}
              onCheckedChange={(checked) => setFormData({ ...formData, is_template: checked })}
            />
            <Label htmlFor="edit-bundle-template">Template bundle</Label>
          </div>

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
                'Update Bundle'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Create Bundle Dialog Component
function CreateBundleDialog({
  open,
  onOpenChange,
  onSubmit,
  isCreating,
  availablePermissions
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePermissionBundleDto) => Promise<void>;
  isCreating: boolean;
  availablePermissions: Permission[];
}) {
  const [formData, setFormData] = useState<CreatePermissionBundleDto>({
    name: '',
    description: '',
    scope: 'tenant',
    is_template: false,
    permission_ids: []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Create Bundle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Permission Bundle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="bundle-name">Bundle Name</Label>
            <Input
              id="bundle-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter bundle name"
              required
            />
          </div>

          <div>
            <Label htmlFor="bundle-description">Description</Label>
            <Input
              id="bundle-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter bundle description"
            />
          </div>

          <div>
            <Label htmlFor="bundle-scope">Scope</Label>
            <Select
              value={formData.scope}
              onValueChange={(value) => {
                if (isBundleScope(value)) {
                  setFormData({ ...formData, scope: value });
                }
              }}
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

          <div>
            <Label className="mb-2 block">Select Permissions</Label>
            <div className="border rounded-md p-4 max-h-64 overflow-y-auto space-y-2">
              {availablePermissions.length > 0 ? (
                availablePermissions.map((permission) => (
                  <div key={permission.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`permission-${permission.id}`}
                      checked={formData.permission_ids?.includes(permission.id) || false}
                      onCheckedChange={(checked) => {
                        const currentIds = formData.permission_ids || [];
                        if (checked) {
                          setFormData({ ...formData, permission_ids: [...currentIds, permission.id] });
                        } else {
                          setFormData({ ...formData, permission_ids: currentIds.filter(id => id !== permission.id) });
                        }
                      }}
                    />
                    <Label htmlFor={`permission-${permission.id}`} className="text-sm font-normal cursor-pointer flex-1">
                      <div>
                        <span className="font-medium">{permission.name}</span>
                        {permission.description && (
                          <span className="text-xs text-gray-500 block">{permission.description}</span>
                        )}
                      </div>
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No permissions available</p>
              )}
            </div>
            {formData.permission_ids && formData.permission_ids.length > 0 && (
              <p className="text-xs text-gray-600 mt-1">
                {formData.permission_ids.length} permission(s) selected
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="bundle-template"
              checked={formData.is_template}
              onCheckedChange={(checked) => setFormData({ ...formData, is_template: checked })}
            />
            <Label htmlFor="bundle-template">Template bundle</Label>
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
                'Create Bundle'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}