'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building,
  Users,
  Shield,
  Plus,
  Edit,
  Eye,
  UserPlus,
  UserMinus,
  Crown,
  Map,
  Activity,
  CheckCircle,
  AlertTriangle,
  Info,
  Settings,
  Search,
  Filter,
  RefreshCw,
  Layers,
  Key,
  Globe
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import type {
  DelegatedContext,
  MultiRoleContext,
  Role,
  UserWithRoles,
  UserRole,
  Permission
} from '@/models/rbac.model';

interface DelegatedUser extends UserWithRoles {
  campus_id?: string;
  ministry_id?: string;
  delegated_roles: Role[];
  effective_scope: 'campus' | 'ministry';
}

interface DelegationScope {
  id: string;
  name: string;
  type: 'campus' | 'ministry';
  user_count: number;
  role_count: number;
  parent_id?: string;
}

interface DelegatedStats {
  totalUsers: number;
  activeUsers: number;
  totalRoles: number;
  delegatableRoles: number;
  scopeCount: number;
  recentChanges: number;
}

export function DelegatedConsole() {
  const [delegatedContext, setDelegatedContext] = useState<DelegatedContext | null>(null);
  const [scopes, setScopes] = useState<DelegationScope[]>([]);
  const [delegatedUsers, setDelegatedUsers] = useState<DelegatedUser[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [stats, setStats] = useState<DelegatedStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalRoles: 0,
    delegatableRoles: 0,
    scopeCount: 0,
    recentChanges: 0
  });
  const [selectedUser, setSelectedUser] = useState<DelegatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [selectedScopeId, setSelectedScopeId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const closeAssignDialog = () => {
    setShowAssignDialog(false);
    setSelectedUser(null);
    setSelectedRoleId('');
    setSelectedScopeId('');
    setIsAssigning(false);
  };

  const openAssignDialog = (user?: DelegatedUser | null) => {
    setSelectedUser(user ?? null);
    const inferredScopeId = user?.campus_id ?? user?.ministry_id ?? '';
    if (inferredScopeId) {
      setSelectedScopeId(inferredScopeId);
    } else if (scopes.length === 1) {
      setSelectedScopeId(scopes[0].id);
    } else {
      setSelectedScopeId('');
    }
    setSelectedRoleId('');
    setShowAssignDialog(true);
  };

  useEffect(() => {
    loadDelegatedData();
  }, []);

  useEffect(() => {
    if (!showAssignDialog) {
      return;
    }

    if (!selectedScopeId && scopes.length === 1) {
      setSelectedScopeId(scopes[0].id);
    }
  }, [showAssignDialog, scopes, selectedScopeId]);

  const loadDelegatedData = async () => {
    try {
      setIsLoading(true);

      // Load current user's delegated context
      const contextRes = await fetch('/api/rbac/delegation/context');
      const contextData = await contextRes.json();

      if (contextData.success) {
        setDelegatedContext(contextData.data);

        // Load scoped data based on delegation context
        const [scopesRes, usersRes, rolesRes, statsRes] = await Promise.all([
          fetch('/api/rbac/delegation/scopes'),
          fetch('/api/rbac/delegation/users'),
          fetch('/api/rbac/delegation/roles'),
          fetch('/api/rbac/delegation/stats')
        ]);

        const [scopesData, usersData, rolesData, statsData] = await Promise.all([
          scopesRes.json(),
          usersRes.json(),
          rolesRes.json(),
          statsRes.json()
        ]);

        if (scopesData.success) setScopes(scopesData.data);
        if (usersData.success) setDelegatedUsers(usersData.data);
        if (rolesData.success) setAvailableRoles(rolesData.data);
        if (statsData.success) setStats(statsData.data);
      } else {
        toast.error('No delegation permissions found');
      }
    } catch (error) {
      console.error('Error loading delegated data:', error);
      toast.error('Failed to load delegation console');
    } finally {
      setIsLoading(false);
    }
  };

  const assignRoleToUser = async (userId: string, roleId: string, scopeId?: string) => {
    try {
      const response = await fetch('/api/rbac/delegation/assign-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          role_id: roleId,
          scope_id: scopeId
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Role assigned successfully');
        await loadDelegatedData();
        closeAssignDialog();
        return true;
      } else {
        toast.error(result.error || 'Failed to assign role');
        return false;
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Failed to assign role');
      return false;
    }
  };

  const revokeRoleFromUser = async (userId: string, roleId: string) => {
    try {
      const response = await fetch('/api/rbac/delegation/revoke-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          role_id: roleId
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Role revoked successfully');
        loadDelegatedData();
      } else {
        toast.error(result.error || 'Failed to revoke role');
      }
    } catch (error) {
      console.error('Error revoking role:', error);
      toast.error('Failed to revoke role');
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser) {
      toast.error('Select a user to assign a role');
      return;
    }
    if (!selectedRoleId) {
      toast.error('Select a role to assign');
      return;
    }
    if (!selectedScopeId && scopes.length > 1) {
      toast.error('Select a scope for this assignment');
      return;
    }

    setIsAssigning(true);
    try {
      await assignRoleToUser(selectedUser.id, selectedRoleId, selectedScopeId || undefined);
    } finally {
      setIsAssigning(false);
    }
  };

  const getScopeIcon = (type: string) => {
    switch (type) {
      case 'campus': return <Building className="h-4 w-4" />;
      case 'ministry': return <Users className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  const getScopeColor = (type: string) => {
    switch (type) {
      case 'campus': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ministry': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleColor = (scope: string) => {
    switch (scope) {
      case 'system': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'tenant': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'campus': return 'bg-green-100 text-green-800 border-green-200';
      case 'ministry': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredUsers = delegatedUsers.filter(user => {
    if (searchTerm && !user.email?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (scopeFilter !== 'all' && user.effective_scope !== scopeFilter) {
      return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!delegatedContext) {
    return (
      <div className="text-center py-16">
        <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Delegation Permissions</h2>
        <p className="text-gray-600 mb-4">
          You don't have delegation permissions to manage users in any scope.
        </p>
        <p className="text-sm text-gray-500">
          Contact your administrator to request delegation access for campus or ministry management.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Delegated RBAC Console
          </h1>
          <p className="text-gray-600">
            Manage user access within your {delegatedContext.scope} scope
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className={getScopeColor(delegatedContext.scope)}>
              {getScopeIcon(delegatedContext.scope)}
              <span className="ml-1 capitalize">{delegatedContext.scope} Scope</span>
            </Badge>
            <Badge variant="secondary">
              <Crown className="h-3 w-3 mr-1" />
              Delegation Rights
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadDelegatedData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => openAssignDialog()}>
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Role
          </Button>
        </div>
      </div>

      {/* Delegation Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Managed Users</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-green-600">{stats.activeUsers} active</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available Roles</p>
                <p className="text-3xl font-bold text-green-600">{stats.delegatableRoles}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">of {stats.totalRoles} total</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Scope Count</p>
                <p className="text-3xl font-bold text-purple-600">{stats.scopeCount}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Map className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">managed areas</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="users" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="users">Users ({filteredUsers.length})</TabsTrigger>
            <TabsTrigger value="scopes">Scopes ({scopes.length})</TabsTrigger>
            <TabsTrigger value="roles">Available Roles ({availableRoles.length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="search">Search Users</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search by name or email..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Scope Filter</Label>
                  <Select value={scopeFilter} onValueChange={setScopeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Scopes</SelectItem>
                      <SelectItem value="campus">Campus Users</SelectItem>
                      <SelectItem value="ministry">Ministry Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Delegated Users</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Assigned Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getScopeColor(user.effective_scope)}>
                          {getScopeIcon(user.effective_scope)}
                          <span className="ml-1 capitalize">{user.effective_scope}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {user.delegated_roles.map((role) => (
                            <Badge key={role.id} variant="outline" className={getRoleColor(role.scope)}>
                              <Shield className="h-3 w-3 mr-1" />
                              {role.name}
                            </Badge>
                          ))}
                          {user.delegated_roles.length === 0 && (
                            <span className="text-sm text-gray-400">No roles assigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.delegated_roles.length > 0 ? 'default' : 'secondary'}>
                          {user.delegated_roles.length > 0 ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAssignDialog(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No users found matching your criteria</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scopes">
          <Card>
            <CardHeader>
              <CardTitle>Delegation Scopes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scopes.map((scope) => (
                  <Card key={scope.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getScopeIcon(scope.type)}
                          <h3 className="font-medium">{scope.name}</h3>
                        </div>
                        <Badge variant="outline" className={getScopeColor(scope.type)}>
                          {scope.type}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Users:</span>
                          <span className="font-medium">{scope.user_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Roles:</span>
                          <span className="font-medium">{scope.role_count}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle>Available Roles for Delegation</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Delegatable</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{role.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getRoleColor(role.scope)}>
                          {role.scope}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.is_delegatable ? 'default' : 'secondary'}>
                          {role.is_delegatable ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{role.description || 'No description'}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Role Assignment Dialog */}
      <Dialog
        open={showAssignDialog}
        onOpenChange={(open) => {
          if (open) {
            setShowAssignDialog(true);
          } else {
            closeAssignDialog();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Role to User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You can only assign roles within your delegation scope. System-level roles require higher privileges.
              </AlertDescription>
            </Alert>

            <div>
              <Label>Select User</Label>
              <Select value={selectedUser?.id || ''} onValueChange={(value) => {
                const user = delegatedUsers.find(u => u.id === value) || null;
                setSelectedUser(user);
                if (user) {
                  const inferred = user.campus_id ?? user.ministry_id ?? '';
                  if (inferred) {
                    setSelectedScopeId(inferred);
                  } else if (scopes.length === 1) {
                    setSelectedScopeId(scopes[0].id);
                  } else {
                    setSelectedScopeId('');
                  }
                } else {
                  setSelectedScopeId('');
                }
                setSelectedRoleId('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {delegatedUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Select Role</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role..." />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles
                    .filter(role => role.is_delegatable)
                    .map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name} ({role.scope})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {scopes.length > 1 && (
              <div>
                <Label>Select Scope</Label>
                <Select value={selectedScopeId} onValueChange={setSelectedScopeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a scope..." />
                  </SelectTrigger>
                  <SelectContent>
                    {scopes.map(scope => (
                      <SelectItem key={scope.id} value={scope.id}>
                        {scope.name} ({scope.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={closeAssignDialog}>
              Cancel
            </Button>
            <Button onClick={handleAssignRole} disabled={isAssigning}>
              <UserPlus className="h-4 w-4 mr-2" />
              {isAssigning ? 'Assigning...' : 'Assign Role'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      {selectedUser && (
        <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>User Role Management</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-600">User Information</Label>
                  <div className="mt-2 space-y-2">
                    <p className="font-medium">{selectedUser.first_name} {selectedUser.last_name}</p>
                    <p className="text-sm text-gray-600">{selectedUser.email}</p>
                    <Badge variant="outline" className={getScopeColor(selectedUser.effective_scope)}>
                      {getScopeIcon(selectedUser.effective_scope)}
                      <span className="ml-1 capitalize">{selectedUser.effective_scope} User</span>
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">Current Roles</Label>
                  <div className="mt-2 space-y-2">
                    {selectedUser.delegated_roles.map((role) => (
                      <div key={role.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">{role.name}</span>
                          <Badge variant="outline" className={getRoleColor(role.scope)}>
                            {role.scope}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => revokeRoleFromUser(selectedUser.id, role.id)}
                        >
                          <UserMinus className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {selectedUser.delegated_roles.length === 0 && (
                      <p className="text-sm text-gray-400">No roles assigned</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
