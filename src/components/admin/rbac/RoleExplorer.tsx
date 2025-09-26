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
  UserPlus
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Role, PermissionBundle, CreateRoleDto, CreatePermissionBundleDto } from '@/models/rbac.model';

interface RoleWithStats extends Role {
  user_count: number;
  bundle_count: number;
}

interface BundleWithStats extends PermissionBundle {
  role_count: number;
  permission_count: number;
}

export function RoleExplorer() {
  const [roles, setRoles] = useState<RoleWithStats[]>([]);
  const [bundles, setBundles] = useState<BundleWithStats[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<RoleWithStats[]>([]);
  const [filteredBundles, setFilteredBundles] = useState<BundleWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [showSystemRoles, setShowSystemRoles] = useState(true);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [isCreateBundleOpen, setIsCreateBundleOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleWithStats | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<BundleWithStats | null>(null);

  useEffect(() => {
    loadData();
  }, [showSystemRoles]);

  useEffect(() => {
    filterData();
  }, [roles, bundles, searchTerm, scopeFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [rolesRes, bundlesRes] = await Promise.all([
        fetch(`/api/rbac/roles?includeSystem=${showSystemRoles}`),
        fetch('/api/rbac/bundles')
      ]);

      const [rolesData, bundlesData] = await Promise.all([
        rolesRes.json(),
        bundlesRes.json()
      ]);

      if (rolesData.success) {
        // Add mock statistics for now
        const rolesWithStats = rolesData.data.map((role: Role) => ({
          ...role,
          user_count: Math.floor(Math.random() * 50) + 1,
          bundle_count: Math.floor(Math.random() * 5) + 1
        }));
        setRoles(rolesWithStats);
      }

      if (bundlesData.success) {
        // Add mock statistics for now
        const bundlesWithStats = bundlesData.data.map((bundle: PermissionBundle) => ({
          ...bundle,
          role_count: Math.floor(Math.random() * 10) + 1,
          permission_count: Math.floor(Math.random() * 20) + 5
        }));
        setBundles(bundlesWithStats);
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
      case 'system': return 'bg-red-100 text-red-800 border-red-200';
      case 'tenant': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'campus': return 'bg-green-100 text-green-800 border-green-200';
      case 'ministry': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleCreateRole = async (data: CreateRoleDto) => {
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
    }
  };

  const handleCreateBundle = async (data: CreatePermissionBundleDto) => {
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
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;

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
    }
  };

  const handleDeleteBundle = async (bundleId: string) => {
    if (!confirm('Are you sure you want to delete this bundle?')) return;

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
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
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
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
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

            <div className="w-full md:w-48">
              <Label>Scope Filter</Label>
              <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scopes</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="tenant">Tenant</SelectItem>
                  <SelectItem value="campus">Campus</SelectItem>
                  <SelectItem value="ministry">Ministry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-system"
                checked={showSystemRoles}
                onCheckedChange={setShowSystemRoles}
              />
              <Label htmlFor="show-system" className="text-sm">
                Include System Roles
              </Label>
            </div>
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
            />

            <CreateBundleDialog
              open={isCreateBundleOpen}
              onOpenChange={setIsCreateBundleOpen}
              onSubmit={handleCreateBundle}
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
                    <TableHead>Description</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Bundles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getScopeColor(role.scope)}>
                          <span className="flex items-center gap-1">
                            {getScopeIcon(role.scope)}
                            {role.scope}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {role.description || 'No description'}
                      </TableCell>
                      <TableCell>{role.user_count}</TableCell>
                      <TableCell>{role.bundle_count}</TableCell>
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedRole(role)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!role.is_system && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteRole(role.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
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
                    <TableHead>Description</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBundles.map((bundle) => (
                    <TableRow key={bundle.id}>
                      <TableCell className="font-medium">{bundle.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getScopeColor(bundle.scope)}>
                          <span className="flex items-center gap-1">
                            {getScopeIcon(bundle.scope)}
                            {bundle.scope}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {bundle.description || 'No description'}
                      </TableCell>
                      <TableCell>{bundle.role_count}</TableCell>
                      <TableCell>{bundle.permission_count}</TableCell>
                      <TableCell>
                        {bundle.is_template && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Template
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedBundle(bundle)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteBundle(bundle.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
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
    </div>
  );
}

// Create Role Dialog Component
function CreateRoleDialog({
  open,
  onOpenChange,
  onSubmit
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateRoleDto) => Promise<void>;
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Role</Button>
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
  onSubmit
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePermissionBundleDto) => Promise<void>;
}) {
  const [formData, setFormData] = useState<CreatePermissionBundleDto>({
    name: '',
    description: '',
    scope: 'tenant',
    is_template: false
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
      <DialogContent className="max-w-md">
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
              id="bundle-template"
              checked={formData.is_template}
              onCheckedChange={(checked) => setFormData({ ...formData, is_template: checked })}
            />
            <Label htmlFor="bundle-template">Template bundle</Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Bundle</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}