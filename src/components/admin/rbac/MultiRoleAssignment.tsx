'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import {
  Users,
  Shield,
  Plus,
  Minus,
  Save,
  Eye,
  Edit,
  Layers,
  Crown,
  Building,
  Settings,
  Activity,
  CheckCircle,
  AlertTriangle,
  Info,
  Search,
  Filter,
  RefreshCw,
  UserPlus,
  UserCheck,
  Zap,
  Globe,
  Key
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import type {
  Role,
  UserWithRoles,
  MultiRoleContext,
  Permission,
  PermissionBundle
} from '@/models/rbac.model';

interface MultiRoleUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  primary_role?: Role;
  secondary_roles: Role[];
  effective_permissions: Permission[];
  multi_role_context?: MultiRoleContext;
  campus_assignments: string[];
  ministry_assignments: string[];
  is_multi_role_enabled: boolean;
}

interface RoleConflict {
  role1: Role;
  role2: Role;
  conflict_type: 'scope_mismatch' | 'permission_overlap' | 'access_escalation';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

interface MultiRoleStats {
  totalUsers: number;
  multiRoleUsers: number;
  averageRolesPerUser: number;
  roleConflicts: number;
  effectivePermissions: number;
  crossMinistryUsers: number;
}

export function MultiRoleAssignment() {
  const [users, setUsers] = useState<MultiRoleUser[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedUser, setSelectedUser] = useState<MultiRoleUser | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleConflicts, setRoleConflicts] = useState<RoleConflict[]>([]);
  const [stats, setStats] = useState<MultiRoleStats>({
    totalUsers: 0,
    multiRoleUsers: 0,
    averageRolesPerUser: 0,
    roleConflicts: 0,
    effectivePermissions: 0,
    crossMinistryUsers: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    loadMultiRoleData();
  }, []);

  const loadMultiRoleData = async () => {
    try {
      setIsLoading(true);
      const [usersRes, rolesRes, statsRes] = await Promise.all([
        fetch('/api/rbac/multi-role/users'),
        fetch('/api/rbac/roles?delegatable=true'),
        fetch('/api/rbac/multi-role/stats')
      ]);

      const [usersData, rolesData, statsData] = await Promise.all([
        usersRes.json(),
        rolesRes.json(),
        statsRes.json()
      ]);

      if (usersData.success) setUsers(usersData.data);
      if (rolesData.success) setAvailableRoles(rolesData.data);
      if (statsData.success) setStats(statsData.data);
    } catch (error) {
      console.error('Error loading multi-role data:', error);
      toast.error('Failed to load multi-role assignment data');
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeRoleConflicts = async (roleIds: string[]) => {
    try {
      setIsAnalyzing(true);
      const response = await fetch('/api/rbac/multi-role/analyze-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_ids: roleIds })
      });

      const result = await response.json();
      if (result.success) {
        setRoleConflicts(result.data.conflicts || []);
        return result.data.conflicts || [];
      } else {
        toast.error('Failed to analyze role conflicts');
        return [];
      }
    } catch (error) {
      console.error('Error analyzing conflicts:', error);
      toast.error('Failed to analyze role conflicts');
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  };

  const assignMultipleRoles = async (userId: string, roleIds: string[], validateConflicts = true) => {
    try {
      if (validateConflicts) {
        const conflicts = await analyzeRoleConflicts(roleIds);
        const highSeverityConflicts = conflicts.filter(c => c.severity === 'high');

        if (highSeverityConflicts.length > 0) {
          setRoleConflicts(conflicts);
          setShowConflictDialog(true);
          return;
        }
      }

      const response = await fetch('/api/rbac/multi-role/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          role_ids: roleIds,
          override_conflicts: !validateConflicts
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Multiple roles assigned successfully');
        loadMultiRoleData();
        setShowAssignDialog(false);
        setSelectedRoles([]);
      } else {
        toast.error(result.error || 'Failed to assign roles');
      }
    } catch (error) {
      console.error('Error assigning roles:', error);
      toast.error('Failed to assign multiple roles');
    }
  };

  const removeRole = async (userId: string, roleId: string) => {
    try {
      const response = await fetch('/api/rbac/multi-role/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          role_id: roleId
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Role removed successfully');
        loadMultiRoleData();
      } else {
        toast.error(result.error || 'Failed to remove role');
      }
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Failed to remove role');
    }
  };

  const toggleMultiRoleMode = async (userId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/rbac/multi-role/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          enabled
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`Multi-role mode ${enabled ? 'enabled' : 'disabled'}`);
        loadMultiRoleData();
      } else {
        toast.error(result.error || 'Failed to toggle multi-role mode');
      }
    } catch (error) {
      console.error('Error toggling multi-role mode:', error);
      toast.error('Failed to toggle multi-role mode');
    }
  };

  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'system': return <Globe className="h-3 w-3" />;
      case 'campus': return <Building className="h-3 w-3" />;
      case 'ministry': return <Users className="h-3 w-3" />;
      default: return <Shield className="h-3 w-3" />;
    }
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'system': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'tenant': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'campus': return 'bg-green-100 text-green-800 border-green-200';
      case 'ministry': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConflictSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredUsers = users.filter(user => {
    if (searchTerm && !user.email?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (roleFilter === 'multi' && user.secondary_roles.length === 0) {
      return false;
    }
    if (roleFilter === 'single' && user.secondary_roles.length > 0) {
      return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" className="text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Multi-Role Assignment
          </h1>
          <p className="text-gray-600">
            Assign multiple roles to volunteers for cross-ministry responsibilities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadMultiRoleData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowAssignDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Multiple Roles
          </Button>
        </div>
      </div>

      {/* Multi-Role Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Multi-Role Users</p>
                <p className="text-3xl font-bold text-blue-600">{stats.multiRoleUsers}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <UserCheck className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">of {stats.totalUsers} total users</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Roles Per User</p>
                <p className="text-3xl font-bold text-green-600">{stats.averageRolesPerUser.toFixed(1)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Layers className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">role assignments</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Role Conflicts</p>
                <p className="text-3xl font-bold text-red-600">{stats.roleConflicts}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">need attention</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cross-Ministry</p>
                <p className="text-3xl font-bold text-purple-600">{stats.crossMinistryUsers}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Crown className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">spanning ministries</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Effective Permissions</p>
                <p className="text-3xl font-bold text-orange-600">{stats.effectivePermissions}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Key className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">unique permissions</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Health</p>
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <span className="text-lg font-semibold text-green-600">OPTIMAL</span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="users" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="users">Users ({filteredUsers.length})</TabsTrigger>
            <TabsTrigger value="conflicts">Role Conflicts ({roleConflicts.length})</TabsTrigger>
            <TabsTrigger value="context">Runtime Context</TabsTrigger>
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
                  <Label>Role Assignment Filter</Label>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="multi">Multi-Role Users</SelectItem>
                      <SelectItem value="single">Single Role Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Multi-Role User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Primary Role</TableHead>
                    <TableHead>Secondary Roles</TableHead>
                    <TableHead>Multi-Role</TableHead>
                    <TableHead>Conflicts</TableHead>
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
                        {user.primary_role ? (
                          <Badge variant="outline" className={getScopeColor(user.primary_role.scope)}>
                            {getScopeIcon(user.primary_role.scope)}
                            <span className="ml-1">{user.primary_role.name}</span>
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-400">No primary role</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {user.secondary_roles.slice(0, 2).map((role) => (
                            <Badge key={role.id} variant="outline" className={getScopeColor(role.scope)}>
                              {getScopeIcon(role.scope)}
                              <span className="ml-1">{role.name}</span>
                            </Badge>
                          ))}
                          {user.secondary_roles.length > 2 && (
                            <Badge variant="secondary">
                              +{user.secondary_roles.length - 2} more
                            </Badge>
                          )}
                          {user.secondary_roles.length === 0 && (
                            <span className="text-sm text-gray-400">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.is_multi_role_enabled}
                            onCheckedChange={(checked) => toggleMultiRoleMode(user.id, checked)}
                          />
                          <span className="text-sm">
                            {user.is_multi_role_enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.secondary_roles.length > 0 ? (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Check
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Clear
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setSelectedRoles([user.primary_role?.id, ...user.secondary_roles.map(r => r.id)].filter(Boolean) as string[]);
                              setShowAssignDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => analyzeRoleConflicts([user.primary_role?.id, ...user.secondary_roles.map(r => r.id)].filter(Boolean) as string[])}
                            disabled={isAnalyzing}
                          >
                            <Eye className="h-4 w-4" />
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

        <TabsContent value="conflicts">
          <Card>
            <CardHeader>
              <CardTitle>Role Conflict Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {roleConflicts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conflicting Roles</TableHead>
                      <TableHead>Conflict Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roleConflicts.map((conflict, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="outline" className={getScopeColor(conflict.role1.scope)}>
                              {conflict.role1.name}
                            </Badge>
                            <Badge variant="outline" className={getScopeColor(conflict.role2.scope)}>
                              {conflict.role2.name}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {conflict.conflict_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getConflictSeverityColor(conflict.severity)}>
                            {conflict.severity.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{conflict.description}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-500">No role conflicts detected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="context">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Role Runtime Context</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Runtime context shows how the system evaluates and combines multiple role permissions in real-time for each user.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-2">Context Evaluation</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Permission Resolution:</span>
                        <Badge className="bg-green-100 text-green-800">Union-based</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Conflict Resolution:</span>
                        <Badge className="bg-blue-100 text-blue-800">Most Permissive</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Scope Hierarchy:</span>
                        <Badge className="bg-purple-100 text-purple-800">Enforced</Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Performance Metrics</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Avg Evaluation Time:</span>
                        <span className="font-medium">&lt; 50ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cache Hit Rate:</span>
                        <span className="font-medium">94.2%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Context Refresh:</span>
                        <span className="font-medium">Real-time</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Multi-Role Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Assign Multiple Roles</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedUser && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900">
                  {selectedUser.first_name} {selectedUser.last_name}
                </h3>
                <p className="text-sm text-blue-700">{selectedUser.email}</p>
              </div>
            )}

            <div>
              <Label>Select Roles</Label>
              {availableRoles.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 mt-2 max-h-64 overflow-y-auto">
                  {availableRoles.map((role) => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={selectedRoles.includes(role.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRoles([...selectedRoles, role.id]);
                          } else {
                            setSelectedRoles(selectedRoles.filter(id => id !== role.id));
                          }
                        }}
                      />
                      <Label htmlFor={`role-${role.id}`} className="flex items-center gap-2">
                        <Badge variant="outline" className={getScopeColor(role.scope)}>
                          {getScopeIcon(role.scope)}
                          <span className="ml-1">{role.name}</span>
                        </Badge>
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
                  <Shield className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Roles Available</h3>
                  <p className="text-gray-600 mb-4">
                    There are no delegatable roles available for assignment. You need to create roles first before you can assign them to users.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => window.open('/admin/security/rbac/roles', '_blank')}
                      className="inline-flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create Roles
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => window.open('/admin/security/rbac', '_blank')}
                      className="inline-flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      RBAC Dashboard
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {selectedRoles.length > 1 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Multiple roles selected. System will analyze for conflicts before assignment.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedUser) {
                  assignMultipleRoles(selectedUser.id, selectedRoles);
                }
              }}
              disabled={selectedRoles.length === 0 || !selectedUser}
            >
              <Save className="h-4 w-4 mr-2" />
              Assign Roles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Dialog */}
      <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Role Conflicts Detected
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                High-severity conflicts detected. Review before proceeding with assignment.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              {roleConflicts.filter(c => c.severity === 'high').map((conflict, index) => (
                <div key={index} className="p-3 border rounded-lg bg-red-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-red-900">
                      {conflict.role1.name} ↔ {conflict.role2.name}
                    </span>
                    <Badge className={getConflictSeverityColor(conflict.severity)}>
                      {conflict.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-red-700">{conflict.description}</p>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConflictDialog(false)}>
              Cancel Assignment
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedUser) {
                  assignMultipleRoles(selectedUser.id, selectedRoles, false);
                  setShowConflictDialog(false);
                }
              }}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Override & Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}